import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/promoter/profile/avatar
 * Upload avatar image for promoter profile
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Find promoter linked to this user (check both user_id and created_by like profile route does)
    let { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id, profile_image_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!promoter) {
      // Fallback: check created_by
      const { data: promoterByCreator } = await serviceSupabase
        .from("promoters")
        .select("id, profile_image_url")
        .eq("created_by", user.id)
        .maybeSingle();
      
      promoter = promoterByCreator;
    }

    if (!promoter) {
      return NextResponse.json({ error: "Promoter profile not found" }, { status: 404 });
    }

    // Delete old avatar if it exists
    if (promoter.profile_image_url) {
      try {
        // Extract path from URL
        const urlParts = promoter.profile_image_url.split("/promoter-avatars/");
        if (urlParts.length > 1) {
          const oldPath = `promoter-avatars/${urlParts[1]}`;
          await deleteFromStorage("avatars", oldPath);
        }
      } catch (err) {
        // Ignore errors deleting old avatar (file might not exist)
        console.error("Error deleting old promoter avatar:", err);
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${promoter.id}-${Date.now()}.${fileExt}`;
    const filePath = `promoter-avatars/${fileName}`;

    // Upload to Supabase Storage
    const avatarUrl = await uploadToStorage("avatars", filePath, buffer, file.type);

    // Update promoter record with new avatar URL
    await serviceSupabase
      .from("promoters")
      .update({ profile_image_url: avatarUrl })
      .eq("id", promoter.id);

    return NextResponse.json(
      { avatar_url: avatarUrl },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error uploading promoter avatar:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/promoter/profile/avatar
 * Delete avatar image for promoter profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Find promoter linked to this user (check both user_id and created_by like profile route does)
    let { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id, profile_image_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!promoter) {
      // Fallback: check created_by
      const { data: promoterByCreator } = await serviceSupabase
        .from("promoters")
        .select("id, profile_image_url")
        .eq("created_by", user.id)
        .maybeSingle();
      
      promoter = promoterByCreator;
    }

    if (!promoter) {
      return NextResponse.json({ error: "Promoter profile not found" }, { status: 404 });
    }

    if (!promoter.profile_image_url) {
      return NextResponse.json({ error: "No avatar to delete" }, { status: 404 });
    }

    // Delete from storage
    try {
      const urlParts = promoter.profile_image_url.split("/promoter-avatars/");
      if (urlParts.length > 1) {
        const oldPath = `promoter-avatars/${urlParts[1]}`;
        await deleteFromStorage("avatars", oldPath);
      }
    } catch (err) {
      console.error("Error deleting promoter avatar from storage:", err);
    }

    // Update promoter record
    await serviceSupabase
      .from("promoters")
      .update({ profile_image_url: null })
      .eq("id", promoter.id);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error deleting promoter avatar:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete avatar" },
      { status: 500 }
    );
  }
}
