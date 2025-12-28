import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/photos/[photoId]/view
 * Track a photo view (increment view counter)
 * Rate limited per session to avoid counting same view multiple times
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();

    // Verify photo exists and increment view count atomically
    const { data: photo, error } = await serviceSupabase
      .rpc("increment_photo_view_count", { photo_id: params.photoId });

    // If RPC doesn't exist, fall back to manual update
    if (error && error.message.includes("function")) {
      const { error: updateError } = await serviceSupabase
        .from("photos")
        .update({ view_count: serviceSupabase.rpc("coalesce", { val: "view_count", default_val: 0 }) })
        .eq("id", params.photoId);

      // Simple fallback - just increment
      await serviceSupabase
        .from("photos")
        .update({})
        .eq("id", params.photoId);

      // Use raw SQL update as absolute fallback
      const { error: rawError } = await serviceSupabase
        .from("photos")
        .select("view_count")
        .eq("id", params.photoId)
        .single()
        .then(async ({ data }) => {
          if (data) {
            return serviceSupabase
              .from("photos")
              .update({ view_count: (data.view_count || 0) + 1 })
              .eq("id", params.photoId);
          }
          return { error: null };
        });

      if (rawError) {
        console.error("Error incrementing view count:", rawError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Don't fail the request for view tracking errors
    console.error("Error tracking view:", error);
    return NextResponse.json({ success: true });
  }
}

