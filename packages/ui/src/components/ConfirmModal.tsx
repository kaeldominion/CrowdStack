"use client";

import { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Trash2, XCircle, HelpCircle } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  /** Style variant for the modal */
  variant?: "default" | "danger" | "warning";
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Show loading state on confirm button */
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
}: ConfirmModalProps) {
  const iconConfig = {
    default: {
      icon: HelpCircle,
      bgClass: "bg-accent-primary/10",
      iconClass: "text-accent-primary",
    },
    warning: {
      icon: AlertTriangle,
      bgClass: "bg-accent-warning/10",
      iconClass: "text-accent-warning",
    },
    danger: {
      icon: Trash2,
      bgClass: "bg-accent-error/10",
      iconClass: "text-accent-error",
    },
  };

  const { icon: Icon, bgClass, iconClass } = iconConfig[variant];

  const buttonVariant = variant === "danger" ? "danger" : variant === "warning" ? "secondary" : "primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            loading={loading}
            className={variant === "danger" ? "bg-accent-error hover:bg-accent-error/90 border-accent-error" : ""}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center mb-4`}>
          <Icon className={`h-7 w-7 ${iconClass}`} />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-primary mb-2">
          {title}
        </h3>
        
        {/* Message */}
        <p className="text-sm text-secondary max-w-sm">
          {message}
        </p>
      </div>
    </Modal>
  );
}
