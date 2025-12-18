"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface SectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "xl";
}

export function Section({ 
  children, 
  className,
  spacing = "lg"
}: SectionProps) {
  const spacingClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16",
    xl: "py-24",
  };

  return (
    <section className={cn(spacingClasses[spacing], className)}>
      {children}
    </section>
  );
}

