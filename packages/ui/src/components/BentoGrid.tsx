"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  className,
  name,
  description,
  href,
  cta,
  image,
  icon,
  rows = 1,
  cols = 1,
  children,
}: {
  className?: string;
  name?: string;
  description?: string;
  href?: string;
  cta?: string;
  image?: string;
  icon?: ReactNode;
  rows?: number;
  cols?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-lg p-6 transition-all duration-300",
        className
      )}
      style={{
        gridRow: `span ${rows}`,
        gridColumn: `span ${cols}`,
      }}
    >
      {image && (
        <img
          src={image}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-300 group-hover:opacity-30"
        />
      )}
      
      <div className="relative z-10 flex flex-col h-full">
        {icon && (
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg">
            {icon}
          </div>
        )}
        
        {name && (
          <h3 className="text-lg font-semibold tracking-tight text-white mb-2">
            {name}
          </h3>
        )}
        
        {description && (
          <p className="text-sm text-white/60 leading-relaxed flex-1">
            {description}
          </p>
        )}

        {children}

        {cta && href && (
          <div className="mt-4">
            <a
              href={href}
              className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
            >
              {cta}
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

