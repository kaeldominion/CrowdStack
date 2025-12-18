import "server-only";

import { createClient } from "../supabase/server";
import { getUserRole, userHasRole, getUserRoles } from "./roles";
import type { UserRole } from "../types";

/**
 * Check if user can access a venue
 */
export async function canAccessVenue(venueId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Venue admins can access their venue
  if (await userHasRole("venue_admin")) {
    const { data } = await supabase
      .from("venues")
      .select("id")
      .eq("id", venueId)
      .eq("created_by", user.id)
      .single();

    return !!data;
  }

  return false;
}

/**
 * Check if user can access an event
 */
export async function canAccessEvent(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const role = await getUserRole();

  // Organizers can access their events
  if (role === "event_organizer") {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (organizer) {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("organizer_id", organizer.id)
        .single();

      if (event) {
        return true;
      }
    }
  }

  // Venue admins can access events at their venue
  if (role === "venue_admin") {
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (venue) {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("venue_id", venue.id)
        .single();

      if (event) {
        return true;
      }
    }
  }

  // Promoters can access assigned events
  if (role === "promoter") {
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (promoter) {
      const { data: eventPromoter } = await supabase
        .from("event_promoters")
        .select("event_id")
        .eq("event_id", eventId)
        .eq("promoter_id", promoter.id)
        .single();

      if (eventPromoter) {
        return true;
      }
    }
  }

  // Door staff can access all events (for check-in)
  if (role === "door_staff") {
    return true;
  }

  // Published events are publicly accessible
  const { data: event } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  return event?.status === "published";
}

/**
 * Check if user can manage an event (create, update, delete)
 */
export async function canManageEvent(eventId: string | null): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Check if superadmin
  const roles = await getUserRoles();
  const isSuperadmin = roles.includes("superadmin");

  if (!eventId) {
    // Creating new event - check if user is organizer or superadmin
    return isSuperadmin || (await userHasRole("event_organizer"));
  }

  if (isSuperadmin) {
    return true;
  }

  // Only organizers can manage events
  if (!(await userHasRole("event_organizer"))) {
    return false;
  }

  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id)
    .single();

  if (!organizer) {
    return false;
  }

  const { data: event } = await supabase
    .from("events")
    .select("organizer_id, locked_at")
    .eq("id", eventId)
    .single();

  if (!event) {
    return false;
  }

  // Can't manage locked events (unless superadmin - checked above)
  if (event.locked_at) {
    return false;
  }

  return event.organizer_id === organizer.id;
}

/**
 * Check if user can check in attendees (door staff)
 */
export async function canCheckIn(): Promise<boolean> {
  return await userHasRole("door_staff");
}

/**
 * Check if user can view payouts
 */
export async function canViewPayouts(eventId: string): Promise<boolean> {
  const role = await getUserRole();

  // Organizers can view payouts for their events
  if (role === "event_organizer") {
    return await canManageEvent(eventId);
  }

  // Promoters can view their own payouts
  if (role === "promoter") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data: promoter } = await supabase
      .from("promoters")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (!promoter) {
      return false;
    }

    const { data: payoutRun } = await supabase
      .from("payout_runs")
      .select("id")
      .eq("event_id", eventId)
      .single();

    if (!payoutRun) {
      return false;
    }

    const { data: payoutLine } = await supabase
      .from("payout_lines")
      .select("id")
      .eq("payout_run_id", payoutRun.id)
      .eq("promoter_id", promoter.id)
      .single();

    return !!payoutLine;
  }

  return false;
}

