import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canUploadPhotosToEvent } from "@crowdstack/shared/auth/photo-permissions";

/**
 * PATCH /api/events/[eventId]/photos/cover
 * Set cover photo for album
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
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json(
        { error: "photoId is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get album
    const { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("id")
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    // Verify photo belongs to this album
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("id")
      .eq("id", photoId)
      .eq("album_id", album.id)
      .single();

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found in this album" },
        { status: 404 }
      );
    }

    // Update cover photo
    const { data: updatedAlbum, error } = await serviceSupabase
      .from("photo_albums")
      .update({ cover_photo_id: photoId })
      .eq("id", album.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, album: updatedAlbum });
  } catch (error: any) {
    console.error("Error setting cover photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set cover photo" },
      { status: 500 }
    );
  }
}

