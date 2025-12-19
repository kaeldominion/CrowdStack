"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import { cn } from "../utils/cn";
import { ChevronDown } from "lucide-react";

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  active?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
  triggerClassName?: string;
}

export function Dropdown({ trigger, items, align = "right", className, triggerClassName }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn("flex items-center gap-2", triggerClassName)}
      >
        {trigger}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute z-20 mt-2 w-56 rounded-md bg-surface border border-border shadow-card py-1",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background transition-colors",
                  item.destructive && "text-error hover:bg-error/10",
                  item.active && "bg-primary/10 text-primary"
                )}
              >
                {item.icon && <span className="h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

