import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/dj/mixes/[mixId]/cover
 * Upload mix cover image
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(
  request: NextRequest,
  { params }: { params: { mixId: string } }
) {
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

    const serviceSupabase = createServiceRoleClient();

    // Verify mix belongs to DJ
    const { data: mix } = await serviceSupabase
      .from("mixes")
      .select("id, dj_id, cover_image_url")
      .eq("id", params.mixId)
      .eq("dj_id", djId)
      .single();

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
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

    // Delete old cover if it exists
    if (mix.cover_image_url) {
      const oldFileName = mix.cover_image_url.split("/").slice(-3).join("/");
      // Only delete if it's from our bucket
      if (mix.cover_image_url.includes("dj-images")) {
        await deleteFromStorage("dj-images", oldFileName).catch((err) => {
          console.error("Error deleting old cover:", err);
          // Don't fail the request if deletion fails
        });
      }
    }

    // Upload new image
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${djId}/mixes/${params.mixId}/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const publicUrl = await uploadToStorage(
      "dj-images",
      fileName,
      file,
      file.type
    );

    // Update mix with new cover URL
    const { error: updateError } = await serviceSupabase
      .from("mixes")
      .update({ cover_image_url: publicUrl })
      .eq("id", params.mixId);

    if (updateError) {
      console.error("Error updating mix:", updateError);
      // Try to delete uploaded file
      await deleteFromStorage("dj-images", fileName);
      return NextResponse.json({ error: "Failed to update mix" }, { status: 500 });
    }

    return NextResponse.json({ cover_url: publicUrl });
  } catch (error: any) {
    console.error("Error uploading mix cover:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

