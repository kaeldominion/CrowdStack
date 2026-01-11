import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

export const dynamic = 'force-dynamic';

/**
 * POST /api/venue/upload-image
 * Upload logo or cover image for venue
 * Query params:
 *   - venueId=xxx (optional, for admin access)
 *   - type=logo|cover (required)
 */
export async function POST(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const venueIdParam = searchParams.get("venueId");
    const imageType = searchParams.get("type"); // "logo" or "cover"

    if (!imageType || !["logo", "cover"].includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'logo' or 'cover'" },
        { status: 400 }
      );
    }

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max for logo/cover)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Use service role client to update venue
    const serviceClient = createServiceRoleClient();

    // Get current venue to check for existing image
    const { data: venue } = await serviceClient
      .from("venues")
      .select("logo_url, cover_image_url, slug")
      .eq("id", venueId)
      .single();

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "webp";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${venueId}/${imageType}/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "venue-images",
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Delete old image if exists (check if it's a storage path, not external URL)
    const oldUrl = imageType === "logo" ? venue?.logo_url : venue?.cover_image_url;
    if (oldUrl && !oldUrl.startsWith("http") && !oldUrl.startsWith("data:")) {
      try {
        await deleteFromStorage("venue-images", oldUrl);
      } catch (e) {
        console.error("Failed to delete old image:", e);
      }
    }

    // Update venue with new image URL
    const updateField = imageType === "logo" ? "logo_url" : "cover_image_url";
    const { error: updateError } = await serviceClient
      .from("venues")
      .update({
        [updateField]: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", venueId);

    if (updateError) {
      // Clean up uploaded file on error
      await deleteFromStorage("venue-images", storagePath);
      return NextResponse.json(
        { error: updateError.message || "Failed to update venue" },
        { status: 500 }
      );
    }

    // Revalidate venue public profile page
    if (venue?.slug) {
      try {
        revalidatePath(`/v/${venue.slug}`);
      } catch (e) {
        console.error("Failed to revalidate venue page:", e);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: imageType,
    });
  } catch (error: any) {
    console.error("Failed to upload venue image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
