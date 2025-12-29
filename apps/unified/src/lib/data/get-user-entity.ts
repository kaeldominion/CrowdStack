import "server-only";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * Get the current user's venue ID
 * Returns the first venue the user has access to (via venue_users or created_by)
 */
export async function getUserVenueId(): Promise<string | null> {

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check junction table first (new way)
  const { data: venueUser } = await supabase
    .from("venue_users")
    .select("venue_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (venueUser?.venue_id) {
    console.log("[getUserVenueId] Found venue via venue_users:", venueUser.venue_id);
    return venueUser.venue_id;
  }

  // Fallback to created_by (backward compatibility)
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id")
    .eq("created_by", user.id)
    .limit(1)
    .single();

  console.log("[getUserVenueId] Venue query result:", { venue: venue?.id, error: error?.message });
  return venue?.id || null;
}

/**
 * Get the current user's organizer ID
 * Returns the first organizer the user has access to (via organizer_users or created_by)
 */
export async function getUserOrganizerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check junction table first (new way)
  const { data: organizerUser } = await supabase
    .from("organizer_users")
    .select("organizer_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (organizerUser?.organizer_id) {
    return organizerUser.organizer_id;
  }

  // Fallback to created_by (backward compatibility)
  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id)
    .limit(1)
    .single();

  return organizer?.id || null;
}

/**
 * Get the current user's promoter ID
 * Returns the promoter profile linked to the user via user_id
 */
export async function getUserPromoterId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check user_id first (new way - one-to-one with user)
  const { data: promoter } = await supabase
    .from("promoters")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (promoter?.id) {
    return promoter.id;
  }

  // Fallback to created_by (backward compatibility)
  const { data: promoterLegacy } = await supabase
    .from("promoters")
    .select("id")
    .eq("created_by", user.id)
    .limit(1)
    .single();

  return promoterLegacy?.id || null;
}

/**
 * Get the current user's DJ ID
 * Returns the DJ profile linked to the user via user_id (one-to-one)
 */
export async function getUserDJId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // DJs are linked one-to-one via user_id
  const { data: dj } = await supabase
    .from("djs")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return dj?.id || null;
}

