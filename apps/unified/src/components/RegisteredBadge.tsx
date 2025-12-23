"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface RegisteredBadgeProps {
  eventSlug: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RegisteredBadge({ eventSlug, className = "", size = "md" }: RegisteredBadgeProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const response = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
        if (response.ok) {
          const data = await response.json();
          setIsRegistered(data.registered || false);
        }
      } catch (error) {
        console.error("Error checking registration:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkRegistration();
  }, [eventSlug]);

  if (isChecking || !isRegistered) {
    return null;
  }

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className={`flex items-center justify-center rounded-full bg-green-500/90 text-white shadow-lg ${className}`} title="You're registered for this event">
      <CheckCircle2 className={sizeClasses[size]} />
    </div>
  );
}

