import "server-only";
import { createServiceRoleClient } from "../supabase/server";
import { headers } from "next/headers";

export type ActivityActionType =
  // User/Attendee actions
  | "register"
  | "checkin"
  | "checkout"
  | "profile_update"
  | "profile_view"
  | "event_view"
  | "event_share"
  | "photo_view"
  | "photo_download"
  // Event management actions
  | "event_create"
  | "event_edit"
  | "event_publish"
  | "event_unpublish"
  | "event_delete"
  | "event_approve"
  | "event_reject"
  | "event_feature"
  | "event_unfeature"
  // Promoter actions
  | "promoter_assign"
  | "promoter_unassign"
  | "promoter_request"
  | "promoter_approve"
  | "promoter_reject"
  | "promoter_link_share"
  | "promoter_qr_scan"
  // Organizer actions
  | "organizer_create"
  | "organizer_edit"
  | "organizer_user_add"
  | "organizer_user_remove"
  // Venue actions
  | "venue_create"
  | "venue_edit"
  | "venue_user_add"
  | "venue_user_remove"
  // Door staff actions
  | "door_staff_assign"
  | "door_staff_unassign"
  | "door_staff_checkin"
  // Photo actions
  | "photo_upload"
  | "photo_delete"
  | "photo_publish"
  | "photo_unpublish"
  | "album_create"
  | "album_delete"
  // Registration actions
  | "registration_create"
  | "registration_cancel"
  | "registration_update"
  // Admin actions
  | "admin_user_edit"
  | "admin_user_delete"
  | "admin_impersonate"
  | "admin_impersonate_end";

export type ActivityEntityType =
  | "event"
  | "attendee"
  | "promoter"
  | "organizer"
  | "venue"
  | "registration"
  | "checkin"
  | "photo"
  | "album"
  | "user"
  | "door_staff"
  | "invite_code";

export interface ActivityMetadata {
  [key: string]: any;
  old_value?: any;
  new_value?: any;
  reason?: string;
  description?: string;
  email?: string;
  name?: string;
}

/**
 * Log an activity to the activity_logs table
 * This is a server-side function that uses the service role client
 */
export async function logActivity(
  userId: string | null,
  actionType: ActivityActionType,
  entityType: ActivityEntityType,
  entityId?: string | null,
  metadata?: ActivityMetadata
): Promise<string | null> {
  try {
    const serviceSupabase = createServiceRoleClient();
    
    // Get IP address and user agent from headers
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || 
                     headersList.get("x-real-ip") || 
                     null;
    const userAgent = headersList.get("user-agent") || null;

    const { data, error } = await serviceSupabase.rpc("log_activity", {
      p_user_id: userId,
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_metadata: metadata || {},
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error("[logActivity] Error logging activity:", error);
      return null;
    }

    return data as string;
  } catch (error) {
    // Don't throw - logging failures shouldn't break the flow
    console.error("[logActivity] Exception logging activity:", error);
    return null;
  }
}

/**
 * Log multiple activities in a batch
 */
export async function logActivities(
  activities: Array<{
    userId: string | null;
    actionType: ActivityActionType;
    entityType: ActivityEntityType;
    entityId?: string | null;
    metadata?: ActivityMetadata;
  }>
): Promise<void> {
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0] || 
                   headersList.get("x-real-ip") || 
                   null;
  const userAgent = headersList.get("user-agent") || null;

  const logs = activities.map((activity) => ({
    user_id: activity.userId,
    action_type: activity.actionType,
    entity_type: activity.entityType,
    entity_id: activity.entityId || null,
    metadata: activity.metadata || {},
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
  }));

  const { error } = await serviceSupabase.from("activity_logs").insert(logs);

  if (error) {
    console.error("[logActivities] Error logging activities:", error);
  }
}

