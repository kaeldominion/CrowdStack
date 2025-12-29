import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/dj/profile/avatar
 * Upload DJ profile avatar
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();
    if (!djId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get existing profile image to delete later
    const { data: existingDJ } = await serviceSupabase
      .from("djs")
      .select("profile_image_url")
      .eq("id", djId)
      .single();

    // Upload new image
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${djId}/avatar/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const publicUrl = await uploadToStorage(
      "dj-images",
      fileName,
      file,
      file.type
    );

    // Update DJ profile with new image URL
    const { error: updateError } = await serviceSupabase
      .from("djs")
      .update({ profile_image_url: publicUrl })
      .eq("id", djId);

    if (updateError) {
      console.error("Error updating DJ profile:", updateError);
      // Try to delete uploaded file
      await deleteFromStorage("dj-images", fileName);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Delete old image if it exists
    if (existingDJ?.profile_image_url) {
      const oldFileName = existingDJ.profile_image_url.split("/").slice(-2).join("/");
      // Only delete if it's from our bucket
      if (existingDJ.profile_image_url.includes("dj-images")) {
        await deleteFromStorage("dj-images", oldFileName).catch((err) => {
          console.error("Error deleting old avatar:", err);
          // Don't fail the request if deletion fails
        });
      }
    }

    return NextResponse.json({ avatar_url: publicUrl });
  } catch (error: any) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

