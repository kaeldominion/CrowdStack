import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * POST /api/venue/gallery/[imageId]/hero
 * Set image as hero image
 */
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

    // Verify image belongs to venue
    const { data: image, error: imageError } = await supabase
      .from("venue_gallery")
      .select("*")
      .eq("id", params.imageId)
      .eq("venue_id", venueId)
      .single();

    if (imageError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Unset all other hero images
    await supabase
      .from("venue_gallery")
      .update({ is_hero: false })
      .eq("venue_id", venueId)
      .eq("is_hero", true)
      .neq("id", params.imageId);

    // Set this image as hero
    const { data: updatedImage, error: updateError } = await supabase
      .from("venue_gallery")
      .update({ is_hero: true })
      .eq("id", params.imageId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update hero image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: updatedImage });
  } catch (error: any) {
    console.error("Failed to set hero image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set hero image" },
      { status: 500 }
    );
  }
}

