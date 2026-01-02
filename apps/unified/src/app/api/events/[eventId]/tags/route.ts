import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/events/[eventId]/tags
 * Get all tags for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const eventId = params.eventId;

    const { data: tags, error } = await supabase
      .from("event_tags")
      .select("*")
      .eq("event_id", eventId)
      .order("tag_type", { ascending: true })
      .order("tag_value", { ascending: true });

    if (error) {
      console.error("[Event Tags] Error fetching tags:", error);
      return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error: any) {
    console.error("[Event Tags] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/events/[eventId]/tags
 * Add a tag to an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const eventId = params.eventId;

    const body = await request.json();
    const { tag_type = "music", tag_value } = body;

    if (!tag_value) {
      return NextResponse.json({ error: "tag_value is required" }, { status: 400 });
    }

    // Verify user has permission to edit this event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user is organizer owner, organizer team member, or venue admin
    let hasPermission = false;

    // Check superadmin
    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    if (await userHasRole("superadmin")) {
      hasPermission = true;
    }

    if (!hasPermission && event.organizer_id) {
      // Check if user is organizer owner
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("created_by")
        .eq("id", event.organizer_id)
        .single();
      if (organizer?.created_by === userId) {
        hasPermission = true;
      }

      // Check if user is organizer team member
      if (!hasPermission) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("id")
          .eq("organizer_id", event.organizer_id)
          .eq("user_id", userId)
          .single();
        if (organizerUser) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission && event.venue_id) {
      // Check if user is venue owner
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("created_by")
        .eq("id", event.venue_id)
        .single();
      if (venue?.created_by === userId) {
        hasPermission = true;
      }

      // Check if user is venue team member
      if (!hasPermission) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", userId)
          .single();
        if (venueUser) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert tag (UNIQUE constraint will prevent duplicates)
    const { data: tag, error: insertError } = await serviceSupabase
      .from("event_tags")
      .insert({
        event_id: eventId,
        tag_type,
        tag_value,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation - tag already exists
        return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
      }
      console.error("[Event Tags] Error inserting tag:", insertError);
      return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
    }

    return NextResponse.json({ tag });
  } catch (error: any) {
    console.error("[Event Tags] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/events/[eventId]/tags
 * Remove a tag from an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const eventId = params.eventId;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const tagValue = searchParams.get("tagValue");
    const tagType = searchParams.get("tagType") || "music";

    if (!tagId && !tagValue) {
      return NextResponse.json({ error: "tagId or tagValue is required" }, { status: 400 });
    }

    // Verify user has permission to edit this event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user is organizer owner, organizer team member, or venue admin
    let hasPermission = false;

    // Check superadmin
    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    if (await userHasRole("superadmin")) {
      hasPermission = true;
    }

    if (!hasPermission && event.organizer_id) {
      // Check if user is organizer owner
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("created_by")
        .eq("id", event.organizer_id)
        .single();
      if (organizer?.created_by === userId) {
        hasPermission = true;
      }

      // Check if user is organizer team member
      if (!hasPermission) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("id")
          .eq("organizer_id", event.organizer_id)
          .eq("user_id", userId)
          .single();
        if (organizerUser) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission && event.venue_id) {
      // Check if user is venue owner
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("created_by")
        .eq("id", event.venue_id)
        .single();
      if (venue?.created_by === userId) {
        hasPermission = true;
      }

      // Check if user is venue team member
      if (!hasPermission) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", userId)
          .single();
        if (venueUser) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete tag
    let deleteQuery = serviceSupabase
      .from("event_tags")
      .delete()
      .eq("event_id", eventId);

    if (tagId) {
      deleteQuery = deleteQuery.eq("id", tagId);
    } else {
      deleteQuery = deleteQuery.eq("tag_type", tagType).eq("tag_value", tagValue!);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error("[Event Tags] Error deleting tag:", deleteError);
      return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Event Tags] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

