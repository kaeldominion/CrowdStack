"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Inline editable text field with click-to-edit UX
 * - Click pencil icon or text to edit
 * - Enter to save, Escape to cancel
 * - Shows loading state during save
 */
export function InlineEditField({
  value,
  onSave,
  placeholder = "Add note...",
  className = "",
  maxLength = 500,
  disabled = false,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled || isSaving) return;
    setEditValue(value);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Skip if no change
    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      // Keep editing on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          maxLength={maxLength}
          disabled={isSaving}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-[var(--bg-raised)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-secondary)]"
          placeholder={placeholder}
        />
        {isSaving ? (
          <Loader2 className="h-3 w-3 text-[var(--text-muted)] animate-spin flex-shrink-0" />
        ) : (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="p-0.5 text-[var(--accent-success)] hover:text-[var(--accent-success)] transition-colors flex-shrink-0"
              title="Save (Enter)"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--accent-error)] transition-colors flex-shrink-0"
              title="Cancel (Escape)"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 cursor-pointer ${className}`}
      onClick={handleStartEdit}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      }}
    >
      {value ? (
        <span className="text-xs text-[var(--text-secondary)] truncate min-w-0">
          {value}
        </span>
      ) : (
        <span className="text-xs text-[var(--text-muted)] italic">
          {placeholder}
        </span>
      )}
      {!disabled && (
        <Pencil className="h-3 w-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </div>
  );
}
