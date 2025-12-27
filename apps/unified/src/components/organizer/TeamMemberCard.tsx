"use client";

import Image from "next/image";
import type { OrganizerTeamMember } from "@crowdstack/shared/types";

interface TeamMemberCardProps {
  member: OrganizerTeamMember;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-12 w-12 text-xs",
  md: "h-16 w-16 text-sm",
  lg: "h-20 w-20 text-base",
};

export function TeamMemberCard({
  member,
  size = "md",
  className = "",
}: TeamMemberCardProps) {
  const getUserInitial = () => {
    if (member.name) return member.name[0].toUpperCase();
    return "T";
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {member.avatar_url ? (
        <div className={`relative ${sizeClasses[size]} flex-shrink-0 border-2 border-border-subtle rounded-full overflow-hidden`}>
          <Image
            src={member.avatar_url}
            alt={member.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-accent-secondary to-accent-primary flex items-center justify-center text-white font-semibold border-2 border-border-subtle flex-shrink-0`}
        >
          {getUserInitial()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary truncate">{member.name}</p>
        {member.role && (
          <p className="text-sm text-secondary truncate">{member.role}</p>
        )}
      </div>
    </div>
  );
}

