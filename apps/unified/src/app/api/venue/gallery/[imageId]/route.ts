import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * DELETE /api/venue/gallery/[imageId]
 * Delete specific gallery image
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found for user" },
        { status: 404 }
      );
    }

    // Verify image belongs to venue and get storage path
    const { data: image, error: imageError } = await supabase
      .from("venue_gallery")
      .select("storage_path, thumbnail_path")
      .eq("id", params.imageId)
      .eq("venue_id", venueId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Delete from storage
    try {
      await deleteFromStorage("venue-images", image.storage_path);
      if (image.thumbnail_path && image.thumbnail_path !== image.storage_path) {
        await deleteFromStorage("venue-images", image.thumbnail_path);
      }
    } catch (storageError) {
      console.error("Failed to delete from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("venue_gallery")
      .delete()
      .eq("id", params.imageId)
      .eq("venue_id", venueId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete gallery image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}

