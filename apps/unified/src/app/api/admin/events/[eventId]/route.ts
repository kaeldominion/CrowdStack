import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userId = user?.id;

  // If no user from Supabase client, try reading from localhost cookie
  if (!userId) {
    const cookieStore = await cookies();
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

  return userId || null;
}

async function isSuperadmin(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .single();
  return !!data;
}

/**
 * GET /api/admin/events/[eventId]
 * Get event details for admin
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get event with related data
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        venue:venues!events_venue_id_fkey(id, name, address, city),
        organizer:organizers!events_organizer_id_fkey(id, name, email, created_by),
        event_promoters(
          id,
          commission_type,
          commission_config,
          promoter:promoters(id, name, email)
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (error) {
      console.error("Error fetching event:", error);
      return NextResponse.json({ error: "Event not found", details: error.message }, { status: 404 });
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch owner details if event has an owner
    let owner: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null = null;
    if (event.owner_user_id) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(event.owner_user_id);
        if (userData?.user) {
          owner = {
            id: userData.user.id,
            email: userData.user.email || null,
            first_name: userData.user.user_metadata?.first_name || null,
            last_name: userData.user.user_metadata?.last_name || null,
          };
        }
      } catch (err) {
        console.error("[Admin Event] Failed to fetch owner details:", err);
      }
    }

    // Get registration count
    const { count: registrationsCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", params.eventId);

    // Get check-ins count through registrations
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", params.eventId);
    
    let checkinsCount = 0;
    const regIds = registrations?.map((r) => r.id) || [];
    
    if (regIds.length > 0) {
      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("registration_id", regIds)
        .is("undo_at", null);
      checkinsCount = count || 0;
    }

    return NextResponse.json({
      event: { ...event, owner },
      stats: {
        registrations_count: registrationsCount || 0,
        checkins_count: checkinsCount,
      },
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/events/[eventId]
 * Update event (superadmin only)
 * Allows superadmins to update event status including publishing
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createServiceRoleClient();

    // Verify event exists
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id, status")
      .eq("id", params.eventId)
      .single();

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only allow updating fields that exist in the events table
    // Note: timezone may not exist in all environments - we'll handle this gracefully
    const allowedFields = [
      'name', 'slug', 'description', 'venue_id', 'organizer_id',
      'start_time', 'end_time', 'capacity', 'ticket_price',
      'flier_url', 'status', 'created_by', 'tags', 'address',
      'private_notes', 'default_commission_type', 'default_commission_config',
      'timezone', 'mobile_style', 'show_photo_email_notice', 'is_featured'
    ];
    
    // Filter body to only include allowed fields that have values
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }
    
    // Superadmins can update any field, including status (can bypass venue approval if needed)
    let updatedEvent;
    let updateError;
    
    // Try the update with all fields first
    const result = await supabase
      .from("events")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.eventId)
      .select()
      .single();
    
    updatedEvent = result.data;
    updateError = result.error;
    
    // If the error is about a missing column (like timezone), retry without that field
    if (updateError && updateError.code === 'PGRST204' && updateError.message?.includes('timezone')) {
      console.warn("Timezone column not found, retrying without it");
      delete updateData.timezone;
      
      const retryResult = await supabase
        .from("events")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.eventId)
        .select()
        .single();
      
      updatedEvent = retryResult.data;
      updateError = retryResult.error;
    }

    if (updateError) {
      console.error("Error updating event:", updateError);
      return NextResponse.json(
        { error: "Failed to update event", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
