"use client";

import Image from "next/image";
import type { Organizer } from "@crowdstack/shared/types";

interface OrganizerLogoProps {
  organizer: Organizer;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

export function OrganizerLogo({
  organizer,
  size = "md",
  className = "",
}: OrganizerLogoProps) {
  const getUserInitial = () => {
    if (organizer.name) return organizer.name[0].toUpperCase();
    return "O";
  };

  if (organizer.logo_url) {
    return (
      <div className={`relative ${sizeClasses[size]} flex-shrink-0 border-2 border-border ${className}`}>
        <Image
          src={organizer.logo_url}
          alt={`${organizer.name} logo`}
          fill
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-none bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl border-2 border-border flex-shrink-0 ${className}`}
    >
      {getUserInitial()}
    </div>
  );
}

