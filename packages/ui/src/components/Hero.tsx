"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Container } from "./Container";
import { Button } from "./Button";

export interface HeroProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  actions?: {
    primary?: {
      label: string;
      href?: string;
      onClick?: () => void;
    };
    secondary?: {
      label: string;
      href?: string;
      onClick?: () => void;
    };
  };
  className?: string;
}

export function Hero({ 
  title, 
  description, 
  actions,
  className 
}: HeroProps) {
  return (
    <Container size="lg" className={cn("text-center", className)}>
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description && (
        <p className="mt-6 text-lg leading-8 text-foreground-muted sm:text-xl max-w-2xl mx-auto">
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-10 flex items-center justify-center gap-x-4">
          {actions.primary && (
            <Button
              size="lg"
              variant="primary"
              href={actions.primary.href}
              onClick={actions.primary.onClick}
            >
              {actions.primary.label}
            </Button>
          )}
          {actions.secondary && (
            <Button
              size="lg"
              variant="ghost"
              href={actions.secondary.href}
              onClick={actions.secondary.onClick}
            >
              {actions.secondary.label}
            </Button>
          )}
        </div>
      )}
    </Container>
  );
}

