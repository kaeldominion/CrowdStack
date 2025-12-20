import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/organizer/logo
 * Upload organizer logo/avatar
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

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
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

    // Validate file size (5MB max for logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${organizerId}/logo/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "organizer-images",
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Update organizer with logo URL
    const serviceSupabase = createServiceRoleClient();
    
    // Delete old logo if exists
    const { data: currentOrganizer } = await serviceSupabase
      .from("organizers")
      .select("logo_url")
      .eq("id", organizerId)
      .single();

    if (currentOrganizer?.logo_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = currentOrganizer.logo_url.split("/organizer-images/");
        if (urlParts.length > 1) {
          await deleteFromStorage("organizer-images", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete old logo:", storageError);
        // Continue even if deletion fails
      }
    }

    // Update organizer with new logo URL
    const { error: updateError } = await serviceSupabase
      .from("organizers")
      .update({ logo_url: publicUrl })
      .eq("id", organizerId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update organizer logo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ logo_url: publicUrl });
  } catch (error: any) {
    console.error("Failed to upload logo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload logo" },
      { status: 500 }
    );
  }
}

