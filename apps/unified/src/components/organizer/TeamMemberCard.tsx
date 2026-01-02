"use client";

import Image from "next/image";
import { Badge } from "@crowdstack/ui";
import { Crown, Mail } from "lucide-react";
import type { OrganizerTeamMember } from "@crowdstack/shared/types";

interface TeamMemberCardProps {
  member: OrganizerTeamMember;
  size?: "sm" | "md" | "lg";
  className?: string;
  showDetails?: boolean; // Show email and permissions
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
  showDetails = false,
}: TeamMemberCardProps) {
  const getUserInitial = () => {
    if (member.name) return member.name[0].toUpperCase();
    return "T";
  };

  const getAccessLevel = () => {
    if (member.is_owner) return "Owner";
    if (!member.permissions) return "No Access";
    if (member.permissions.full_admin === true) return "Full Admin";
    
    // Count enabled permissions
    const permissionKeys = [
      "manage_users",
      "edit_profile",
      "add_events",
      "edit_events",
      "delete_events",
      "view_reports",
      "manage_promoters",
      "publish_photos",
      "manage_payouts",
    ];
    
    const enabledCount = permissionKeys.filter(
      (key) => member.permissions?.[key] === true
    ).length;
    
    if (enabledCount === 0) return "Limited";
    if (enabledCount <= 3) return "Limited";
    if (enabledCount <= 6) return "Standard";
    return "Advanced";
  };

  const accessLevel = getAccessLevel();

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
        <div className="flex items-center gap-2">
          <p className="font-medium text-primary truncate">{member.name}</p>
          {member.is_owner && (
            <Badge variant="primary" className="text-xs flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Owner
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {member.role && (
            <p className="text-sm text-secondary truncate">{member.role}</p>
          )}
          {showDetails && (
            <>
              {member.email && (
                <div className="flex items-center gap-1 text-xs text-secondary">
                  <Mail className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{member.email}</span>
                </div>
              )}
              <Badge 
                variant={member.is_owner ? "primary" : accessLevel === "Full Admin" ? "success" : "default"}
                className="text-xs"
              >
                {accessLevel}
              </Badge>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

