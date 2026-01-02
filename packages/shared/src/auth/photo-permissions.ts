import "server-only";

import { createClient } from "../supabase/server";
import { userHasRole } from "./roles";

/**
 * Check if user can upload photos to an event
 * Allows: superadmin, organizer, promoters assigned to event, venue staff
 */
export async function canUploadPhotosToEvent(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Superadmin can upload to any event
  if (await userHasRole("superadmin")) {
    return true;
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("organizer_id, venue_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return false;
  }

  // Check if user is the organizer
  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id)
    .eq("id", event.organizer_id)
    .single();

  if (organizer) {
    return true;
  }

  // Check if user is a promoter assigned to this event
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

  // Check if user is venue staff for this event's venue
  if (event.venue_id) {
    const { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("created_by", user.id)
      .eq("id", event.venue_id)
      .single();

    if (venue) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user can delete a specific photo
 * Organizers can delete any photo, others can only delete their own
 */
export async function canDeletePhoto(photoId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Superadmin can delete any photo
  if (await userHasRole("superadmin")) {
    return true;
  }

  // Get photo details
  const { data: photo } = await supabase
    .from("photos")
    .select("uploaded_by, album_id, photo_albums(event_id, events(organizer_id))")
    .eq("id", photoId)
    .single();

  if (!photo) {
    return false;
  }

  // User can delete their own photos
  if (photo.uploaded_by === user.id) {
    return true;
  }

  // Organizers can delete any photo from their events
  const event = (photo.photo_albums as any)?.events;
  if (event?.organizer_id) {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
      .eq("id", event.organizer_id)
      .single();

    if (organizer) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user can manage photos for an event (delete, feature, etc.)
 * Allows: superadmin, organizer
 * More restrictive than canUploadPhotosToEvent - only organizers can manage photos
 */
export async function canManageEventPhotos(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  // Superadmin can manage photos for any event
  if (await userHasRole("superadmin")) {
    return true;
  }

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return false;
  }

  // Check if user is the organizer
  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id)
    .eq("id", event.organizer_id)
    .single();

  return !!organizer;
}

