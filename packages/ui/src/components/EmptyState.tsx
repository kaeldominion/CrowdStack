"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "../utils/cn";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-secondary">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-primary mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-secondary max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="primary">
              {action.label}
            </Button>
          </Link>
        ) : action.onClick ? (
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  );
}

