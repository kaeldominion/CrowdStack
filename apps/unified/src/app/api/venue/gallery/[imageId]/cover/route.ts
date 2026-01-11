import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * POST /api/venue/gallery/[imageId]/cover
 * Set gallery image as venue cover image
 * Query params:
 *   - venueId=xxx (optional, for admin access)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(
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

    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    const isVenueAdmin = await userHasRoleOrSuperadmin("venue_admin");

    if (!isSuperadmin && !isVenueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get venueId from query params (for admin) or from user's linked venue
    const { searchParams } = new URL(request.url);
    const venueIdParam = searchParams.get("venueId");

    let venueId: string | null = null;

    if (venueIdParam && isSuperadmin) {
      venueId = venueIdParam;
    } else if (isVenueAdmin) {
      venueId = await getUserVenueId();
    }

    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    // Use service role client to bypass RLS
    const serviceClient = createServiceRoleClient();

    // Get the gallery image
    const { data: image, error: imageError } = await serviceClient
      .from("venue_gallery")
      .select("storage_path")
      .eq("id", params.imageId)
      .eq("venue_id", venueId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Construct the public URL for the storage path
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    const publicUrl = projectRef
      ? `https://${projectRef}.supabase.co/storage/v1/object/public/venue-images/${image.storage_path}`
      : image.storage_path;

    // Update venue cover_image_url
    const { error: updateError } = await serviceClient
      .from("venues")
      .update({
        cover_image_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", venueId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update cover image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, cover_image_url: publicUrl });
  } catch (error: any) {
    console.error("Failed to set cover image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set cover image" },
      { status: 500 }
    );
  }
}
