import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

/**
 * GET /api/events/[eventId]/promoters/search?q=xxx
 * Search for users/promoters by email, name, or phone to add to an event
 * Returns both existing promoters and users who can be converted to promoters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { eventId } = params;

    // Verify user has access to manage this event
    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      // Check if user is the organizer
      const organizerId = await getUserOrganizerId();
      if (organizerId) {
        const { data: event } = await serviceSupabase
          .from("events")
          .select("organizer_id")
          .eq("id", eventId)
          .single();

        if (event?.organizer_id === organizerId) {
          hasAccess = true;
        }
      }

      // Check if user is venue admin for the event's venue
      if (!hasAccess) {
        const { data: event } = await serviceSupabase
          .from("events")
          .select("venue_id, venue:venues(created_by)")
          .eq("id", eventId)
          .single();

        if (event?.venue_id) {
          const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
          if (venue?.created_by === userId) {
            hasAccess = true;
          }

          if (!hasAccess) {
            const { data: venueUser } = await serviceSupabase
              .from("venue_users")
              .select("id")
              .eq("venue_id", event.venue_id)
              .eq("user_id", userId)
              .single();

            if (venueUser) {
              hasAccess = true;
            }
          }
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ promoters: [], users: [] });
    }

    const searchLower = query.toLowerCase();

    // Search existing promoters (all promoters, not just ones who worked together)
    const { data: existingPromoters } = await serviceSupabase
      .from("promoters")
      .select("id, name, email, phone")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20);

    // Also search by username part of email
    const { data: allPromoters } = await serviceSupabase
      .from("promoters")
      .select("id, name, email, phone")
      .limit(100);

    const promotersByUsername = (allPromoters || []).filter((p) => {
      if (!p.email) return false;
      const usernamePart = p.email.toLowerCase().split("@")[0];
      return usernamePart.includes(searchLower) && !existingPromoters?.some((ep) => ep.id === p.id);
    });

    const allMatchingPromoters = [
      ...(existingPromoters || []),
      ...promotersByUsername,
    ];

    // Search for users by email (fuzzy matching)
    const { data: authUsers } = await serviceSupabase.auth.admin.listUsers();
    
    const matchingUsers: Array<{
      id: string;
      email: string;
      name: string;
      isPromoter: boolean;
      promoterId?: string;
    }> = [];

    for (const user of authUsers.users) {
      if (!user.email) continue;

      const emailLower = user.email.toLowerCase();
      let matches = false;

      // Exact match
      if (emailLower === searchLower) {
        matches = true;
      }
      // Email contains search term
      else if (emailLower.includes(searchLower)) {
        matches = true;
      }
      // Username part matches
      else if (searchLower.includes("@")) {
        const usernamePart = searchLower.split("@")[0];
        if (emailLower.split("@")[0].includes(usernamePart)) {
          matches = true;
        }
      } else {
        // Search in username part
        if (emailLower.split("@")[0].includes(searchLower)) {
          matches = true;
        }
      }

      if (matches) {
        // Check if user is already a promoter
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id")
          .eq("created_by", user.id)
          .maybeSingle();

        // Get attendee name if available
        const { data: attendee } = await serviceSupabase
          .from("attendees")
          .select("name")
          .eq("user_id", user.id)
          .maybeSingle();

        matchingUsers.push({
          id: user.id,
          email: user.email,
          name: attendee?.name || user.user_metadata?.full_name || user.email.split("@")[0],
          isPromoter: !!promoter,
          promoterId: promoter?.id,
        });
      }
    }

    // Combine and deduplicate: if a user is already a promoter, prefer the promoter entry
    const promoterMap = new Map<string, any>();
    
    // Add existing promoters
    allMatchingPromoters.forEach((promoter) => {
      promoterMap.set(promoter.id, {
        ...promoter,
        type: "promoter" as const,
      });
    });

    // Add users, but skip if they're already in the promoter list
    matchingUsers.forEach((user) => {
      if (user.isPromoter && user.promoterId) {
        // User is already a promoter, ensure it's in the list
        if (!promoterMap.has(user.promoterId)) {
          promoterMap.set(user.promoterId, {
            id: user.promoterId,
            name: user.name,
            email: user.email,
            phone: null,
            type: "promoter" as const,
            created_by: user.id,
          });
        }
      } else {
        // User is not a promoter yet, add as potential new promoter
        promoterMap.set(`user-${user.id}`, {
          id: `user-${user.id}`, // Temporary ID, will be converted to promoter
          name: user.name,
          email: user.email,
          phone: null,
          type: "user" as const,
          user_id: user.id,
        });
      }
    });

    const results = Array.from(promoterMap.values()).slice(0, 20);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error searching promoters/users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search" },
      { status: 500 }
    );
  }
}

