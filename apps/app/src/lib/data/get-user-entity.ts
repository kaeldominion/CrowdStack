import "server-only";
import { createClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * Check for impersonation cookie and return entity ID if present
 */
async function getImpersonatedEntityId(role: "venue_admin" | "event_organizer" | "promoter"): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get("cs-impersonate-role");
    const entityCookie = cookieStore.get("cs-impersonate-entity-id");

    console.log("[getImpersonatedEntityId] Checking impersonation for role:", role);
    console.log("[getImpersonatedEntityId] roleCookie:", roleCookie?.value, "entityCookie:", entityCookie?.value);

    // Check if impersonating the correct role
    if (roleCookie?.value === role && entityCookie?.value) {
      console.log("[getImpersonatedEntityId] Found impersonated entity:", entityCookie.value);
      return entityCookie.value;
    }

    console.log("[getImpersonatedEntityId] No impersonation found");
    return null;
  } catch (error) {
    console.error("[getImpersonatedEntityId] Error reading cookies:", error);
    return null;
  }
}

/**
 * Get the current user's venue ID (or impersonated venue ID if superadmin)
 * Returns the first venue the user has access to (via venue_users or created_by)
 */
export async function getUserVenueId(): Promise<string | null> {
  console.log("[getUserVenueId] Checking for impersonation...");
  // Check for impersonation first
  const impersonatedId = await getImpersonatedEntityId("venue_admin");
  if (impersonatedId) {
    console.log("[getUserVenueId] Using impersonated venue ID:", impersonatedId);
    return impersonatedId;
  }
  console.log("[getUserVenueId] No impersonation, checking user's actual venues");

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
 * Get the current user's organizer ID (or impersonated organizer ID if superadmin)
 * Returns the first organizer the user has access to (via organizer_users or created_by)
 */
export async function getUserOrganizerId(): Promise<string | null> {
  // Check for impersonation first
  const impersonatedId = await getImpersonatedEntityId("event_organizer");
  if (impersonatedId) {
    return impersonatedId;
  }

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
 * Get the current user's promoter ID (or impersonated promoter ID if superadmin)
 * Returns the promoter profile linked to the user via user_id
 */
export async function getUserPromoterId(): Promise<string | null> {
  // Check for impersonation first
  const impersonatedId = await getImpersonatedEntityId("promoter");
  if (impersonatedId) {
    return impersonatedId;
  }

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

