"use client";

import { useState, useEffect } from "react";
import { Select, Button } from "@crowdstack/ui";
import { Radio, Check } from "lucide-react";

interface DJProfile {
  id: string;
  name: string;
  handle: string;
  profile_image_url: string | null;
  is_selected?: boolean;
}

interface DJProfileSelectorProps {
  onProfileChange?: (djId: string) => void;
  className?: string;
  showLabel?: boolean;
}

export function DJProfileSelector({ 
  onProfileChange, 
  className = "",
  showLabel = true 
}: DJProfileSelectorProps) {
  const [profiles, setProfiles] = useState<DJProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await fetch("/api/dj/profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
        // Get currently selected profile
        const currentProfile = data.profiles?.find((p: DJProfile) => p.is_selected);
        if (currentProfile) {
          setSelectedId(currentProfile.id);
        } else if (data.profiles?.length > 0) {
          setSelectedId(data.profiles[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load DJ profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async (djId: string) => {
    try {
      const response = await fetch("/api/dj/select-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dj_id: djId }),
      });

      if (response.ok) {
        setSelectedId(djId);
        onProfileChange?.(djId);
        // Reload page to update all data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to select DJ profile:", error);
      alert("Failed to switch DJ profile. Please try again.");
    }
  };

  if (loading) {
    return null;
  }

  if (profiles.length <= 1) {
    return null; // Don't show selector if only one profile
  }

  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-xs uppercase tracking-widest text-secondary font-medium mb-2">
          Active DJ Profile
        </label>
      )}
      <Select
        value={selectedId || ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full"
        options={profiles.map((profile) => ({
          value: profile.id,
          label: `${profile.name} ${profile.handle ? `(@${profile.handle})` : ""}`.trim(),
        }))}
      />
    </div>
  );
}

