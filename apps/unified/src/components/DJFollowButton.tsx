"use client";

import { useState, useEffect } from "react";
import { Button } from "@crowdstack/ui";
import { Users, UserPlus, UserMinus } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface DJFollowButtonProps {
  djId: string;
  initialFollowerCount: number;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function DJFollowButton({
  djId,
  initialFollowerCount,
  variant = "primary",
  size = "md",
}: DJFollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check if user is logged in and following
    const checkFollowStatus = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setInitialized(true);
          return;
        }

        const response = await fetch(`/api/djs/${djId}/follow`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing || false);
          setFollowerCount(data.followerCount || 0);
        }
      } catch (error) {
        console.error("Error checking follow status:", error);
      } finally {
        setInitialized(true);
      }
    };

    checkFollowStatus();
  }, [djId]);

  const handleToggleFollow = async () => {
    const supabase = createBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/djs/${djId}/follow`, {
          method: "DELETE",
        });

        if (response.ok) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const response = await fetch(`/api/djs/${djId}/follow`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          setIsFollowing(true);
          setFollowerCount(data.followerCount || followerCount + 1);
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <Button variant={variant} size={size} disabled>
        <Users className="h-4 w-4 mr-2" />
        {followerCount} {followerCount !== 1 ? "followers" : "follower"}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "secondary" : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={loading}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
}

