import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { OutboxEventType } from "../types";

/**
 * Emit an event to the event outbox for n8n polling
 */
export async function emitOutboxEvent(
  eventType: OutboxEventType,
  payload: Record<string, any>
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("event_outbox").insert({
    event_type: eventType,
    payload,
  });

  if (error) {
    throw new Error(`Failed to emit outbox event: ${error.message}`);
  }
}

