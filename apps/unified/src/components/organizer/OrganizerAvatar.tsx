"use client";

import Image from "next/image";
import type { Organizer } from "@crowdstack/shared/types";

interface OrganizerAvatarProps {
  organizer: Organizer;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function OrganizerAvatar({
  organizer,
  size = "md",
  className = "",
}: OrganizerAvatarProps) {
  const getUserInitial = () => {
    if (organizer.name) return organizer.name[0].toUpperCase();
    return "O";
  };

  if (organizer.logo_url) {
    return (
      <div className={`relative ${sizeClasses[size]} flex-shrink-0 border-2 border-border ${className}`}>
        <Image
          src={organizer.logo_url}
          alt={organizer.name}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-none bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold border-2 border-border flex-shrink-0 ${className}`}
    >
      {getUserInitial()}
    </div>
  );
}

