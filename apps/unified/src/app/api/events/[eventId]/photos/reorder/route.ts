import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canUploadPhotosToEvent } from "@crowdstack/shared/auth/photo-permissions";

/**
 * PATCH /api/events/[eventId]/photos/reorder
 * Update display order of photos
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!(await canUploadPhotosToEvent(params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { photoIds } = body;

    if (!Array.isArray(photoIds)) {
      return NextResponse.json(
        { error: "photoIds must be an array" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Update display order for each photo
    const updates = photoIds.map((photoId: string, index: number) =>
      serviceSupabase
        .from("photos")
        .update({ display_order: index })
        .eq("id", photoId)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reorder photos" },
      { status: 500 }
    );
  }
}

