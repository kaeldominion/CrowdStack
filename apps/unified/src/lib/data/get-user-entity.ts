import "server-only";
import { createClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

const SELECTED_VENUE_COOKIE = "selected_venue_id";
const SELECTED_DJ_COOKIE = "selected_dj_id";

/**
 * Get all venues the current user has access to
 * Returns array of venue IDs (via venue_users or created_by)
 */
export async function getUserVenueIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const venueIds: string[] = [];

  // Check junction table (new way)
  const { data: venueUsers } = await supabase
    .from("venue_users")
    .select("venue_id")
    .eq("user_id", user.id);

  if (venueUsers) {
    venueIds.push(...venueUsers.map((vu) => vu.venue_id));
  }

  // Also check created_by (backward compatibility)
  const { data: createdVenues } = await supabase
    .from("venues")
    .select("id")
    .eq("created_by", user.id);

  if (createdVenues) {
    const createdIds = createdVenues.map((v) => v.id);
    // Avoid duplicates
    createdIds.forEach((id) => {
      if (!venueIds.includes(id)) {
        venueIds.push(id);
      }
    });
  }

  return venueIds;
}

/**
 * Get all venues the current user has access to (with details)
 * Returns array of venue objects with id, name, slug
 */
export async function getUserVenues(): Promise<Array<{ id: string; name: string; slug: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const venueIds = await getUserVenueIds();
  if (venueIds.length === 0) {
    return [];
  }

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, slug")
    .in("id", venueIds)
    .order("name", { ascending: true });

  return venues || [];
}

/**
 * Get the selected venue ID from cookie, or fallback to first available venue
 * Returns the selected venue ID if user has access, otherwise the first venue they have access to
 */
export async function getUserVenueId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check for selected venue in cookie
  const cookieStore = await cookies();
  const selectedVenueId = cookieStore.get(SELECTED_VENUE_COOKIE)?.value;

  if (selectedVenueId) {
    // Verify user has access to this venue
    const venueIds = await getUserVenueIds();
    if (venueIds.includes(selectedVenueId)) {
      console.log("[getUserVenueId] Using selected venue from cookie:", selectedVenueId);
      return selectedVenueId;
    }
  }

  // Fallback to first venue
  const venueIds = await getUserVenueIds();
  if (venueIds.length > 0) {
    console.log("[getUserVenueId] Using first available venue:", venueIds[0]);
    return venueIds[0];
  }

  console.log("[getUserVenueId] No venues found for user");
  return null;
}

/**
 * Get all organizer IDs the current user has access to
 * Returns array of organizer IDs (via organizer_users or created_by)
 */
export async function getUserOrganizerIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const organizerIds: string[] = [];

  // Check junction table (new way)
  const { data: organizerUsers } = await supabase
    .from("organizer_users")
    .select("organizer_id")
    .eq("user_id", user.id);

  if (organizerUsers) {
    organizerIds.push(...organizerUsers.map((ou) => ou.organizer_id));
  }

  // Also check created_by (backward compatibility)
  const { data: createdOrganizers } = await supabase
    .from("organizers")
    .select("id")
    .eq("created_by", user.id);

  if (createdOrganizers) {
    const createdIds = createdOrganizers.map((o) => o.id);
    // Avoid duplicates
    createdIds.forEach((id) => {
      if (!organizerIds.includes(id)) {
        organizerIds.push(id);
      }
    });
  }

  return organizerIds;
}

/**
 * Get the current user's organizer ID
 * Returns the first organizer the user has access to (via organizer_users or created_by)
 */
export async function getUserOrganizerId(): Promise<string | null> {
  const organizerIds = await getUserOrganizerIds();
  return organizerIds.length > 0 ? organizerIds[0] : null;
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
 * Get all DJ profile IDs for the current user
 * Users can have multiple DJ profiles
 */
export async function getUserDJIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: djs } = await supabase
    .from("djs")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return djs?.map(dj => dj.id) || [];
}

/**
 * Get all DJ profiles for the current user (with details)
 * Users can have multiple DJ profiles
 */
export async function getUserDJProfiles(): Promise<Array<{ id: string; name: string; handle: string; profile_image_url: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: djs } = await supabase
    .from("djs")
    .select("id, name, handle, profile_image_url")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return djs || [];
}

/**
 * Get the selected DJ ID from cookie, or fallback to first available DJ profile
 * Returns the selected DJ ID if user owns it, otherwise the first DJ profile they own
 */
export async function getUserDJId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check for selected DJ in cookie
  const cookieStore = await cookies();
  const selectedDJId = cookieStore.get(SELECTED_DJ_COOKIE)?.value;

  if (selectedDJId) {
    // Verify user owns this DJ profile
    const { data: dj } = await supabase
      .from("djs")
      .select("id")
      .eq("id", selectedDJId)
      .eq("user_id", user.id)
      .single();

    if (dj) {
      console.log("[getUserDJId] Using selected DJ from cookie:", selectedDJId);
      return dj.id;
    }
  }

  // Fallback to first DJ profile
  const djIds = await getUserDJIds();
  if (djIds.length > 0) {
    console.log("[getUserDJId] Using first available DJ profile:", djIds[0]);
    return djIds[0];
  }

  console.log("[getUserDJId] No DJ profiles found for user");
  return null;
}

