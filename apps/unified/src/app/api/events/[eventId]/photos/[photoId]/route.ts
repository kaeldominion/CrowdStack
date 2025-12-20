import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canDeletePhoto } from "@crowdstack/shared/auth/photo-permissions";
import { deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * DELETE /api/events/[eventId]/photos/[photoId]
 * Delete a photo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; photoId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check delete permissions
    if (!(await canDeletePhoto(params.photoId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get photo details
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("storage_path, album_id")
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete from storage
    try {
      await deleteFromStorage("event-photos", photo.storage_path);
    } catch (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Continue with DB deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await serviceSupabase
      .from("photos")
      .delete()
      .eq("id", params.photoId);

    if (deleteError) {
      throw deleteError;
    }

    // Check if this was the cover photo and update album if needed
    const { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("cover_photo_id")
      .eq("id", photo.album_id)
      .single();

    if (album?.cover_photo_id === params.photoId) {
      await serviceSupabase
        .from("photo_albums")
        .update({ cover_photo_id: null })
        .eq("id", photo.album_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete photo" },
      { status: 500 }
    );
  }
}

