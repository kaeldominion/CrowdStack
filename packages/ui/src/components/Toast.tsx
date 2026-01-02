"use client";

import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-remove after duration
    const duration = toast.duration ?? (toast.type === "error" ? 6000 : 4000);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: "success", title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: "error", title, message, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: "warning", title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: "info", title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: ToastData[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const iconConfig = {
    success: {
      icon: CheckCircle,
      bgClass: "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30",
      iconClass: "text-[var(--accent-success)]",
    },
    error: {
      icon: XCircle,
      bgClass: "bg-[var(--accent-error)]/10 border-[var(--accent-error)]/30",
      iconClass: "text-[var(--accent-error)]",
    },
    warning: {
      icon: AlertTriangle,
      bgClass: "bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/30",
      iconClass: "text-[var(--accent-warning)]",
    },
    info: {
      icon: Info,
      bgClass: "bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/30",
      iconClass: "text-[var(--accent-secondary)]",
    },
  };

  const { icon: Icon, bgClass, iconClass } = iconConfig[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`pointer-events-auto rounded-[var(--radius-lg)] border ${bgClass} backdrop-blur-md p-4 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)]">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-[var(--text-muted)]" />
        </button>
      </div>
    </motion.div>
  );
}

