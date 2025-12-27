import { ReactNode } from "react";
import { cn } from "@crowdstack/ui";

interface SurfaceProps {
  children: ReactNode;
  variant?: "glass" | "raised" | "active" | "void";
  noise?: boolean;
  className?: string;
}

export function Surface({ 
  children, 
  variant = "glass",
  noise = false,
  className 
}: SurfaceProps) {
    const variantClasses = {
        glass: "relative bg-glass/70 border border-border-subtle backdrop-blur-xl ring-1 ring-white/10 shadow-soft rounded-2xl",
        raised: "relative bg-raised border border-border-strong shadow-soft rounded-2xl",
        active: "bg-active border border-border-subtle rounded-2xl",
        void: "bg-void",
      };

  return (
    <div
      className={cn(
        variantClasses[variant],
        noise && "noise-overlay",
        className
      )}
    >
      {children}
    </div>
  );
}

