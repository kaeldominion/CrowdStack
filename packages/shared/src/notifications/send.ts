import { createServiceRoleClient } from "../supabase/server";

export interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Send a notification to a user
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    metadata: data.metadata || {},
  });

  if (error) {
    console.error("Failed to send notification:", error);
    throw error;
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendNotifications(notifications: NotificationData[]): Promise<void> {
  if (notifications.length === 0) return;

  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("notifications").insert(
    notifications.map((n) => ({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || null,
      metadata: n.metadata || {},
    }))
  );

  if (error) {
    console.error("Failed to send notifications:", error);
    throw error;
  }
}

/**
 * Get all user IDs for a venue (venue admins)
 */
export async function getVenueUserIds(venueId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();

  // Get users assigned to venue
  const { data: venueUsers, error: venueUsersError } = await supabase
    .from("venue_users")
    .select("user_id")
    .eq("venue_id", venueId);

  if (venueUsersError) {
    console.error("[getVenueUserIds] Error fetching venue_users:", venueUsersError);
  }
  console.log("[getVenueUserIds] venue_users:", venueUsers);

  // Get venue creator
  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("created_by")
    .eq("id", venueId)
    .single();

  if (venueError) {
    console.error("[getVenueUserIds] Error fetching venue:", venueError);
  }
  console.log("[getVenueUserIds] venue created_by:", venue?.created_by);

  const userIds = new Set<string>();
  
  venueUsers?.forEach((vu) => userIds.add(vu.user_id));
  if (venue?.created_by) userIds.add(venue.created_by);

  console.log("[getVenueUserIds] Final user IDs:", Array.from(userIds));
  return Array.from(userIds);
}

/**
 * Get all user IDs for an organizer
 */
export async function getOrganizerUserIds(organizerId: string): Promise<string[]> {
  const supabase = createServiceRoleClient();

  // Get users assigned to organizer
  const { data: orgUsers } = await supabase
    .from("organizer_users")
    .select("user_id")
    .eq("organizer_id", organizerId);

  // Get organizer creator
  const { data: organizer } = await supabase
    .from("organizers")
    .select("created_by")
    .eq("id", organizerId)
    .single();

  const userIds = new Set<string>();
  
  orgUsers?.forEach((ou) => userIds.add(ou.user_id));
  if (organizer?.created_by) userIds.add(organizer.created_by);

  return Array.from(userIds);
}

/**
 * Notify venue admins about a new event pending approval
 */
export async function notifyVenueOfPendingEvent(
  venueId: string,
  eventId: string,
  eventName: string,
  organizerName: string
): Promise<void> {
  console.log("[Notification] notifyVenueOfPendingEvent called:", { venueId, eventId, eventName, organizerName });
  
  const userIds = await getVenueUserIds(venueId);
  console.log("[Notification] Venue user IDs found:", userIds);

  if (userIds.length === 0) {
    console.warn("[Notification] No venue users found to notify for venue:", venueId);
    return;
  }

  const notifications: NotificationData[] = userIds.map((userId) => ({
    user_id: userId,
    type: "event_pending_approval",
    title: "New Event Pending Approval",
    message: `${organizerName} wants to host "${eventName}" at your venue. Please review and approve.`,
    link: `/app/venue/events/pending`,
    metadata: { event_id: eventId, venue_id: venueId },
  }));

  await sendNotifications(notifications);
  console.log("[Notification] Pending event notifications sent successfully");
}

/**
 * Notify venue admins about a new auto-approved event (from pre-approved organizer)
 */
export async function notifyVenueOfAutoApprovedEvent(
  venueId: string,
  eventId: string,
  eventName: string,
  organizerName: string
): Promise<void> {
  const userIds = await getVenueUserIds(venueId);

  const notifications: NotificationData[] = userIds.map((userId) => ({
    user_id: userId,
    type: "event_auto_approved",
    title: "New Event (Auto-Approved)",
    message: `${organizerName} (pre-approved) has created "${eventName}" at your venue. The event was automatically approved.`,
    link: `/app/venue/events`,
    metadata: { event_id: eventId, venue_id: venueId, auto_approved: true },
  }));

  await sendNotifications(notifications);
}

/**
 * Notify organizer about event approval
 */
export async function notifyOrganizerOfApproval(
  organizerId: string,
  eventId: string,
  eventName: string,
  venueName: string,
  approved: boolean,
  rejectionReason?: string
): Promise<void> {
  const userIds = await getOrganizerUserIds(organizerId);

  const notifications: NotificationData[] = userIds.map((userId) => ({
    user_id: userId,
    type: approved ? "event_approved" : "event_rejected",
    title: approved ? "Event Approved!" : "Event Not Approved",
    message: approved
      ? `Great news! "${eventName}" has been approved by ${venueName}.`
      : `"${eventName}" was not approved by ${venueName}.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
    link: `/app/organizer/events/${eventId}`,
    metadata: { event_id: eventId, approved, rejection_reason: rejectionReason },
  }));

  await sendNotifications(notifications);
}

