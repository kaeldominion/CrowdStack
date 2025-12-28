import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/photos/[photoId]/download
 * Track a photo download and return the download URL
 * Logged-in users only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Allow downloads for logged-in users only
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get photo details
    const { data: photo } = await serviceSupabase
      .from("photos")
      .select(`
        id,
        storage_path,
        download_count,
        album:photo_albums(
          allow_downloads
        )
      `)
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Check if downloads are allowed
    const albumSettings = photo.album as any;
    if (albumSettings?.allow_downloads === false) {
      return NextResponse.json({ error: "Downloads are disabled for this album" }, { status: 403 });
    }

    // Increment download count
    await serviceSupabase
      .from("photos")
      .update({ download_count: (photo.download_count || 0) + 1 })
      .eq("id", params.photoId);

    // Get public URL for download
    const bucketUrl = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/event-photos";
    const downloadUrl = `${bucketUrl}/${photo.storage_path}`;

    return NextResponse.json({
      success: true,
      download_url: downloadUrl,
      filename: photo.storage_path.split("/").pop() || "photo.jpg",
    });
  } catch (error: any) {
    console.error("Error tracking download:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process download" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/photos/[photoId]/download
 * Get photo stats (for organizer dashboard)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();

    const { data: photo } = await serviceSupabase
      .from("photos")
      .select("view_count, download_count, like_count, comment_count")
      .eq("id", params.photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    return NextResponse.json({
      stats: {
        views: photo.view_count || 0,
        downloads: photo.download_count || 0,
        likes: photo.like_count || 0,
        comments: photo.comment_count || 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

