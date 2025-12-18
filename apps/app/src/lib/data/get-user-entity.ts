import "server-only";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * Get the current user's venue ID
 */
export async function getUserVenueId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("created_by", user.id)
    .single();

  return venue?.id || null;
}

/**
 * Get the current user's organizer ID
 */
export async function getUserOrganizerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: organizer } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id)
    .single();

  return organizer?.id || null;
}

/**
 * Get the current user's promoter ID
 */
export async function getUserPromoterId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: promoter } = await supabase
    .from("promoters")
    .select("id")
    .eq("created_by", user.id)
    .single();

  return promoter?.id || null;
}

