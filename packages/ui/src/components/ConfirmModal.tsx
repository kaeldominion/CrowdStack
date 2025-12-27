"use client";

import { ReactNode } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

/**
 * CrowdStack branded confirmation modal
 * Replaces browser's native confirm() dialog
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  const iconColors = {
    danger: "text-red-400 bg-red-500/10 border-red-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  const buttonVariants = {
    danger: "destructive" as const,
    warning: "primary" as const,
    info: "primary" as const,
  };

  const Icon = variant === "danger" ? Trash2 : variant === "warning" ? AlertTriangle : Info;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <div className="flex flex-col items-center text-center py-2">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border mb-4 ${iconColors[variant]}`}>
          <Icon className="h-7 w-7" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-primary mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-secondary text-sm mb-6 max-w-sm">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            loading={loading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

