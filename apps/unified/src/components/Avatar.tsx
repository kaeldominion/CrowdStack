"use client";

import { cn } from "@crowdstack/ui";

interface AvatarProps {
  name?: string;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Avatar component that shows user avatar or initials
 */
export function Avatar({ name, email, avatarUrl, size = "md", className }: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  // Get initials from name or email
  const getInitials = (): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const initials = getInitials();
  const displayName = name || email || "User";

  // Generate a consistent color based on name/email
  const getColor = (): string => {
    const str = name || email || "default";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const bgColor = getColor();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={cn(
          "rounded-full object-cover border-2 border-white/20",
          sizeClasses[size],
          className
        )}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement("div");
            fallback.className = cn(
              "rounded-full flex items-center justify-center font-semibold text-white",
              sizeClasses[size],
              className
            );
            fallback.style.backgroundColor = bgColor;
            fallback.textContent = initials;
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      title={displayName}
    >
      {initials}
    </div>
  );
}

