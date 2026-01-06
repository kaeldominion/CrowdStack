"use client";

import type { ActivityActionType, ActivityEntityType, ActivityMetadata } from "@crowdstack/shared/activity/log-activity";

/**
 * Client-side activity logging
 * Calls the API endpoint to log activities from the client
 */
export async function logActivityClient(
  actionType: ActivityActionType,
  entityType: ActivityEntityType,
  entityId?: string | null,
  metadata?: ActivityMetadata
): Promise<void> {
  try {
    await fetch("/api/activity/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
      }),
    });
  } catch (error) {
    // Silently fail - don't break user experience
    console.error("[logActivityClient] Error logging activity:", error);
  }
}

