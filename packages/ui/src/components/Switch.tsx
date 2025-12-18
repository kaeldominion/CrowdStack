"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            ref={ref}
            checked={checked}
            {...props}
          />
          <div className={cn(
            "w-11 h-6 bg-border rounded-full peer",
            "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary peer-focus:ring-offset-2 peer-focus:ring-offset-background",
            "peer-checked:after:translate-x-full peer-checked:after:border-white",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all",
            "peer-checked:bg-primary"
          )} />
        </label>
        {label && (
          <span className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
      </div>
    );
  }
);

Switch.displayName = "Switch";

