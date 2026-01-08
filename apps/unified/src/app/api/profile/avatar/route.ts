import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/profile/avatar
 * Upload avatar image for current user
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

    // Find attendee linked to this user
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id, avatar_url")
      .eq("user_id", user.id)
      .single();

    // Delete old avatar if it exists
    if (attendee?.avatar_url) {
      try {
        // Extract path from URL (format: https://...supabase.co/storage/v1/object/public/avatars/avatars/filename)
        const urlParts = attendee.avatar_url.split("/avatars/");
        if (urlParts.length > 1) {
          const oldPath = `avatars/${urlParts[1]}`;
          await deleteFromStorage("avatars", oldPath);
        }
      } catch (err) {
        // Ignore errors deleting old avatar (file might not exist)
        console.error("Error deleting old avatar:", err);
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const avatarUrl = await uploadToStorage("avatars", filePath, buffer, file.type);

    // Update attendee record with new avatar URL
    if (attendee) {
      await serviceSupabase
        .from("attendees")
        .update({ avatar_url: avatarUrl })
        .eq("id", attendee.id);
    } else {
      // Create attendee record if it doesn't exist
      await serviceSupabase
        .from("attendees")
        .insert({
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          email: user.email || null,
          avatar_url: avatarUrl,
        });
    }

    // Also update user metadata for quick access
    await serviceSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        avatar_url: avatarUrl,
      },
    });

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (error: any) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/avatar
 * Delete avatar image for current user
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

    // Find attendee linked to this user
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (!attendee?.avatar_url) {
      return NextResponse.json({ error: "No avatar to delete" }, { status: 404 });
    }

    // Delete from storage
    try {
      const urlParts = attendee.avatar_url.split("/avatars/");
      if (urlParts.length > 1) {
        const oldPath = `avatars/${urlParts[1]}`;
        await deleteFromStorage("avatars", oldPath);
      }
    } catch (err) {
      console.error("Error deleting avatar from storage:", err);
    }

    // Update attendee record
    await serviceSupabase
      .from("attendees")
      .update({ avatar_url: null })
      .eq("id", attendee.id);

    // Update user metadata
    await serviceSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        avatar_url: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete avatar" },
      { status: 500 }
    );
  }
}

