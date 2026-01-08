import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/events/[eventId]/lineup
 * Get event lineup (public)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId } = resolvedParams;
    
    const serviceSupabase = createServiceRoleClient();

    const { data: lineups, error } = await serviceSupabase
      .from("event_lineups")
      .select(`
        id,
        display_order,
        set_time,
        is_headliner,
        dj_id,
        djs (
          id,
          handle,
          name,
          profile_image_url,
          genres,
          location
        )
      `)
      .eq("event_id", eventId)
      .order("display_order", { ascending: true });

    // Get gig information for each DJ in the lineup
    if (lineups && lineups.length > 0) {
      const djIds = lineups.map((l: any) => l.dj_id);
      
      // Get confirmed gig responses for these DJs on this event
      const { data: gigResponses } = await serviceSupabase
        .from("dj_gig_responses")
        .select(`
          dj_id,
          status,
          confirmed_at,
          dj_gig_postings!inner(
            id,
            title,
            event_id,
            payment_amount,
            payment_currency,
            show_payment
          )
        `)
        .eq("status", "confirmed")
        .in("dj_id", djIds)
        .eq("dj_gig_postings.event_id", eventId);

      // Map gig info to lineups
      const gigMap = new Map();
      gigResponses?.forEach((gr: any) => {
        // Supabase returns relations as arrays, so we need to access the first element
        const gigPosting = Array.isArray(gr.dj_gig_postings) 
          ? gr.dj_gig_postings[0] 
          : gr.dj_gig_postings;
        
        if (gigPosting) {
          gigMap.set(gr.dj_id, {
            gig_posting_id: gigPosting.id,
            gig_title: gigPosting.title,
            payment_amount: gigPosting.payment_amount,
            payment_currency: gigPosting.payment_currency,
            show_payment: gigPosting.show_payment,
            confirmed_at: gr.confirmed_at,
          });
        }
      });

      // Add gig info to each lineup item
      const lineupsWithGigInfo = lineups.map((lineup: any) => ({
        ...lineup,
        gig_info: gigMap.get(lineup.dj_id) || null,
      }));

      return NextResponse.json({ lineups: lineupsWithGigInfo });
    }

    if (error) {
      console.error("Error fetching lineup:", error);
      return NextResponse.json({ error: "Failed to fetch lineup" }, { status: 500 });
    }

    return NextResponse.json({ lineups: lineups || [] });
  } catch (error: any) {
    console.error("Error fetching lineup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/lineup
 * Add DJ to event lineup (requires event edit permissions)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId } = resolvedParams;

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check event edit permissions (organizer/venue admin)
    const serviceSupabase = createServiceRoleClient();
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      let hasAccess = false;

      // Check if user is organizer
      if (roles.includes("event_organizer")) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.organizer_id)
            .single();
          
          if (organizer) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && roles.includes("venue_admin") && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.venue_id)
            .single();
          
          if (venue) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { dj_id, display_order, set_time, is_headliner } = body;

    if (!dj_id) {
      return NextResponse.json({ error: "dj_id is required" }, { status: 400 });
    }

    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined) {
      const { data: existingLineups } = await serviceSupabase
        .from("event_lineups")
        .select("display_order")
        .eq("event_id", eventId)
        .order("display_order", { ascending: false })
        .limit(1);

      finalDisplayOrder = existingLineups && existingLineups.length > 0
        ? (existingLineups[0].display_order || 0) + 1
        : 0;
    }

    // Check if DJ already exists in lineup
    const { data: existingEntry } = await serviceSupabase
      .from("event_lineups")
      .select("id")
      .eq("event_id", eventId)
      .eq("dj_id", dj_id)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json({ error: "DJ is already in the lineup" }, { status: 400 });
    }

    // Build insert data - is_headliner column may not exist in older database versions
    const insertData: any = {
      event_id: eventId,
      dj_id,
      display_order: finalDisplayOrder,
      set_time: set_time || null,
    };
    
    // Only include is_headliner if provided (column may not exist)
    if (is_headliner !== undefined) {
      insertData.is_headliner = is_headliner || false;
    }

    console.log("[Lineup API] Inserting lineup:", insertData);

    const { data: newLineup, error: createError } = await serviceSupabase
      .from("event_lineups")
      .insert(insertData)
      .select(`
        id,
        display_order,
        set_time,
        dj_id,
        djs (
          id,
          handle,
          name,
          profile_image_url,
          genres,
          location
        )
      `)
      .single();

    if (createError) {
      console.error("[Lineup API] Error adding DJ to lineup:", createError);
      console.error("[Lineup API] Error details:", JSON.stringify(createError, null, 2));
      return NextResponse.json({ 
        error: createError.message || "Failed to add DJ to lineup",
        details: createError.details || null,
        code: createError.code || null
      }, { status: 500 });
    }

    if (!newLineup) {
      console.error("[Lineup API] No lineup returned after insert");
      return NextResponse.json({ error: "Failed to add DJ to lineup - no data returned" }, { status: 500 });
    }

    return NextResponse.json({ lineup: newLineup });
  } catch (error: any) {
    console.error("Error adding DJ to lineup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/lineup
 * Remove DJ from event lineup (requires event edit permissions)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId } = resolvedParams;

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check event edit permissions (same logic as POST)
    const serviceSupabase = createServiceRoleClient();
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      let hasAccess = false;

      // Check if user is organizer
      if (roles.includes("event_organizer")) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.organizer_id)
            .single();
          
          if (organizer) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && roles.includes("venue_admin") && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.venue_id)
            .single();
          
          if (venue) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const djId = searchParams.get("dj_id");

    if (!djId) {
      return NextResponse.json({ error: "dj_id is required" }, { status: 400 });
    }

    const { error: deleteError } = await serviceSupabase
      .from("event_lineups")
      .delete()
      .eq("event_id", eventId)
      .eq("dj_id", djId);

    if (deleteError) {
      console.error("Error removing DJ from lineup:", deleteError);
      return NextResponse.json({ error: "Failed to remove DJ from lineup" }, { status: 500 });
    }

    // Check if this DJ was confirmed via a gig posting
    const { data: gigResponse } = await serviceSupabase
      .from("dj_gig_responses")
      .select(`
        id,
        gig_posting_id,
        dj_gig_postings!inner(event_id, title)
      `)
      .eq("dj_id", djId)
      .eq("status", "confirmed")
      .single();

    // Supabase returns relations as arrays, so we need to access the first element
    const gigPosting = gigResponse?.dj_gig_postings
      ? (Array.isArray(gigResponse.dj_gig_postings) 
          ? gigResponse.dj_gig_postings[0] 
          : gigResponse.dj_gig_postings)
      : null;

    if (gigResponse && gigPosting?.event_id === eventId) {
      // Update gig response status - mark as interested (removed from lineup)
      await serviceSupabase
        .from("dj_gig_responses")
        .update({
          status: "interested",
          confirmed_at: null,
        })
        .eq("id", gigResponse.id);

      // Get DJ user_id for notification
      const { data: dj } = await serviceSupabase
        .from("djs")
        .select("user_id, name, handle")
        .eq("id", djId)
        .single();

      if (dj?.user_id) {
        // Send in-app notification
        const { sendNotification } = await import("@crowdstack/shared/notifications/send");
        await sendNotification({
          user_id: dj.user_id,
          type: "dj_gig_cancelled",
          title: "Removed from Lineup",
          message: `You have been removed from the lineup for "${gigPosting?.title || "this gig"}"`,
          link: `/app/dj/gigs`,
          metadata: {
            event_id: eventId,
            dj_id: djId,
            gig_posting_id: gigResponse.gig_posting_id,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing DJ from lineup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]/lineup
 * Update lineup order or set times (requires event edit permissions)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId } = resolvedParams;

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check event edit permissions (same logic as POST/DELETE)
    const serviceSupabase = createServiceRoleClient();
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      let hasAccess = false;

      // Check if user is organizer
      if (roles.includes("event_organizer")) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.organizer_id)
            .single();
          
          if (organizer) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && roles.includes("venue_admin") && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", userId)
            .eq("id", event.venue_id)
            .single();
          
          if (venue) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { updates } = body; // Array of { lineup_id, display_order?, set_time? }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "updates must be an array" }, { status: 400 });
    }

    const promises = updates.map((update: { lineup_id: string; display_order?: number; set_time?: string | null; is_headliner?: boolean }) => {
      const updateData: any = {};
      if (update.display_order !== undefined) updateData.display_order = update.display_order;
      if (update.set_time !== undefined) updateData.set_time = update.set_time;
      if (update.is_headliner !== undefined) updateData.is_headliner = update.is_headliner;

      return serviceSupabase
        .from("event_lineups")
        .update(updateData)
        .eq("id", update.lineup_id)
        .eq("event_id", eventId);
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating lineup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

