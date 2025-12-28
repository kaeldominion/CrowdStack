import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canUploadPhotosToEvent } from "@crowdstack/shared/auth/photo-permissions";

/**
 * POST /api/events/[eventId]/photos/bulk
 * Bulk operations on photos (delete, feature/unfeature)
 */
export async function POST(
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
    const { action, photoIds } = body;

    if (!action || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide action and photoIds array." },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify all photos belong to this event's album
    const { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("id")
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      return NextResponse.json({ error: "Event album not found" }, { status: 404 });
    }

    const { data: photos } = await serviceSupabase
      .from("photos")
      .select("id, storage_path")
      .eq("album_id", album.id)
      .in("id", photoIds);

    if (!photos || photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: "Some photos not found or don't belong to this event" },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case "delete":
        // Delete photos from storage
        const storagePaths = photos.map((p: { storage_path: string }) => p.storage_path);
        await serviceSupabase.storage.from("event-photos").remove(storagePaths);

        // Delete from database (cascade will handle comments/likes)
        const { error: deleteError } = await serviceSupabase
          .from("photos")
          .delete()
          .in("id", photoIds);

        if (deleteError) {
          throw deleteError;
        }

        result = { deleted: photoIds.length };
        break;

      case "feature":
        // Get current max featured_order
        const { data: maxOrder } = await serviceSupabase
          .from("photos")
          .select("featured_order")
          .eq("album_id", album.id)
          .eq("is_featured", true)
          .order("featured_order", { ascending: false })
          .limit(1)
          .single();

        const startOrder = maxOrder?.featured_order ? maxOrder.featured_order + 1 : 1;

        // Feature photos
        const { error: featureError } = await serviceSupabase
          .from("photos")
          .update({
            is_featured: true,
            featured_order: photoIds.map((_, index) => startOrder + index),
          })
          .in("id", photoIds);

        if (featureError) {
          throw featureError;
        }

        result = { featured: photoIds.length };
        break;

      case "unfeature":
        // Unfeature photos
        const { error: unfeatureError } = await serviceSupabase
          .from("photos")
          .update({
            is_featured: false,
            featured_order: null,
          })
          .in("id", photoIds);

        if (unfeatureError) {
          throw unfeatureError;
        }

        result = { unfeatured: photoIds.length };
        break;

      case "reorder_featured":
        // Reorder featured photos
        const { featuredOrder } = body; // Array of { id, order }
        if (!Array.isArray(featuredOrder)) {
          return NextResponse.json(
            { error: "featuredOrder must be an array" },
            { status: 400 }
          );
        }

        // Update each photo's featured_order
        const updates = featuredOrder.map((item: { id: string; order: number }) =>
          serviceSupabase
            .from("photos")
            .update({ featured_order: item.order })
            .eq("id", item.id)
        );

        await Promise.all(updates);
        result = { reordered: featuredOrder.length };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in bulk photo operation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}

