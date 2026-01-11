"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Pencil, Check, X, Loader2, Upload, Camera } from "lucide-react";
import Image from "next/image";

interface InlineTextProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  textClassName?: string;
  multiline?: boolean;
  rows?: number;
  canEdit: boolean;
}

/**
 * Inline editable text for venue profiles
 * Supports both single-line and multiline editing
 */
export function InlineText({
  value,
  onSave,
  placeholder = "Click to add...",
  className = "",
  textClassName = "",
  multiline = false,
  rows = 3,
  canEdit,
}: InlineTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!canEdit || isSaving) return;
    setEditValue(value || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    if (trimmedValue === (value || "")) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Enter" && e.metaKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    const inputProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      disabled: isSaving,
      placeholder,
      className: `w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-secondary)] ${textClassName}`,
    };

    return (
      <div className={`${className}`}>
        {multiline ? (
          <textarea {...inputProps} rows={rows} />
        ) : (
          <input type="text" {...inputProps} />
        )}
        <div className="flex items-center justify-end gap-2 mt-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 text-[var(--text-muted)] animate-spin" />
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-[var(--accent-secondary)] text-white rounded hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </>
          )}
        </div>
        {multiline && (
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Press ⌘+Enter to save, Escape to cancel
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group relative ${canEdit ? "cursor-pointer" : ""} ${className}`}
      onClick={canEdit ? handleStartEdit : undefined}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={canEdit ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      } : undefined}
    >
      {value ? (
        <span className={textClassName}>{value}</span>
      ) : canEdit ? (
        <span className={`${textClassName} text-[var(--text-muted)] italic`}>
          {placeholder}
        </span>
      ) : null}
      {canEdit && (
        <Pencil className="absolute -right-5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

interface InlineImageProps {
  src: string | null;
  alt: string;
  onUpload: (file: File) => Promise<void>;
  canEdit: boolean;
  type: "logo" | "cover";
  className?: string;
}

/**
 * Inline editable image for venue logos and covers
 */
export function InlineImage({
  src,
  alt,
  onUpload,
  canEdit,
  type,
  className = "",
}: InlineImageProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!canEdit || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error("Failed to upload image:", error);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displaySrc = previewUrl || src;
  const isLogo = type === "logo";

  return (
    <div
      className={`group relative ${canEdit ? "cursor-pointer" : ""} ${className}`}
      onClick={handleClick}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {displaySrc ? (
        <Image
          src={displaySrc}
          alt={alt}
          fill
          sizes={isLogo ? "112px" : "100vw"}
          className="object-cover"
        />
      ) : isLogo ? (
        <div className="h-full w-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
          <span className="text-3xl font-bold text-white">{alt[0]}</span>
        </div>
      ) : (
        <div className="h-full w-full bg-[var(--bg-glass)] flex items-center justify-center">
          <Camera className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
      )}

      {/* Edit overlay */}
      {canEdit && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-white">
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">
                {displaySrc ? "Change" : "Upload"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface VenueEditWrapperProps {
  venueId: string;
  venueSlug: string;
  canEdit: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper that provides edit context to venue profile
 * Handles saving to API
 */
export function VenueEditWrapper({
  venueId,
  venueSlug,
  canEdit,
  children,
}: VenueEditWrapperProps) {
  // This wrapper just passes through - actual editing happens in individual components
  // Could be extended to add global save state, undo, etc.
  return <>{children}</>;
}

/**
 * Hook to handle venue field updates
 */
export function useVenueUpdate(venueId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = async (field: string, value: any) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/venue/settings?venueId=${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue: { [field]: value },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      const result = await response.json();
      return result.venue;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = async (type: "logo" | "cover", file: File) => {
    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/venue/upload-image?type=${type}&venueId=${venueId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload");
      }

      const result = await response.json();
      return result.url;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { updateField, uploadImage, isSaving, error };
}
