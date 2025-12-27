"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-primary mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted",
            "focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-accent-error focus:ring-accent-error focus:border-accent-error",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-accent-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

