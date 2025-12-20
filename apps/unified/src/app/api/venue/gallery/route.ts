import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * GET /api/venue/gallery
 * List gallery images for venue
 * Query params: ?venueId=xxx (optional, for admin access)
 */
export async function GET(request: NextRequest) {
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

    const { data: gallery, error } = await supabase
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venueId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch gallery" },
        { status: 500 }
      );
    }

    return NextResponse.json({ gallery: gallery || [] });
  } catch (error: any) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venue/gallery
 * Upload new gallery image
 * Query params: ?venueId=xxx (optional, for admin access)
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
    const caption = formData.get("caption") as string | null;
    const isHero = formData.get("is_hero") === "true";

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

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${venueId}/gallery/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "venue-images",
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Generate thumbnail path (same as storage path for now, can be enhanced later)
    const thumbnailPath = storagePath;

    // If setting as hero, unset other hero images
    if (isHero) {
      await supabase
        .from("venue_gallery")
        .update({ is_hero: false })
        .eq("venue_id", venueId)
        .eq("is_hero", true);
    }

    // Get max display_order to append at end
    const { data: lastImage } = await supabase
      .from("venue_gallery")
      .select("display_order")
      .eq("venue_id", venueId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const displayOrder = lastImage?.display_order ? lastImage.display_order + 1 : 0;

    // Insert gallery record
    const { data: galleryImage, error: insertError } = await supabase
      .from("venue_gallery")
      .insert({
        venue_id: venueId,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        caption: caption || null,
        is_hero: isHero,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file on error
      await deleteFromStorage("venue-images", storagePath);
      return NextResponse.json(
        { error: insertError.message || "Failed to save gallery image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image: {
        ...galleryImage,
        public_url: publicUrl,
      },
    });
  } catch (error: any) {
    console.error("Failed to upload gallery image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}

