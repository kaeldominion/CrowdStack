"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({ 
  children, 
  className, 
  hover = false, 
  onClick,
  header,
  footer,
}: CardProps) {
  const baseClasses = "rounded-md bg-surface border border-border";
  const hoverClasses = hover || onClick ? "cursor-pointer transition-all hover:border-primary/50 hover:shadow-card" : "";

  const content = (
    <div className={cn(baseClasses, hoverClasses, className)} onClick={onClick}>
      {header && (
        <div className="px-6 py-4 border-b border-border">
          {header}
        </div>
      )}
      <div className={cn("p-6", header && "pt-6", footer && "pb-6")}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );

  return content;
}

