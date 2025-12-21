"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Badge } from "@crowdstack/shared";

interface BadgeAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  badges: Badge[];
  onAwarded?: () => void;
}

export function BadgeAwardModal({
  isOpen,
  onClose,
  userId,
  userName,
  badges,
  onAwarded,
}: BadgeAwardModalProps) {
  const [selectedBadgeId, setSelectedBadgeId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only giftable badges
  const giftableBadges = badges.filter((badge) => badge.is_giftable);

  const handleAward = async () => {
    if (!selectedBadgeId) {
      setError("Please select a badge");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/badges/award", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          badge_id: selectedBadgeId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to award badge");
      }

      // Success
      if (onAwarded) {
        onAwarded();
      }
      onClose();
      setSelectedBadgeId("");
    } catch (err: any) {
      setError(err.message || "Failed to award badge");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Award Badge
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Award a badge to {userName}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {giftableBadges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No giftable badges available
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Badge
              </label>
              <select
                value={selectedBadgeId}
                onChange={(e) => setSelectedBadgeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose a badge...</option>
                {giftableBadges.map((badge) => (
                  <option key={badge.id} value={badge.id}>
                    {badge.name} - {badge.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAward}
              disabled={isLoading || !selectedBadgeId || giftableBadges.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Awarding..." : "Award Badge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

