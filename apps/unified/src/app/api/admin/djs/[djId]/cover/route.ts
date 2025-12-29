import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";
import { cookies } from "next/headers";

/**
 * POST /api/admin/djs/[djId]/cover
 * Upload DJ cover image (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { djId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (parsed.user?.id) {
            userId = parsed.user.id;
          }
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify DJ exists
    const { data: existingDJ } = await serviceSupabase
      .from("djs")
      .select("cover_image_url")
      .eq("id", params.djId)
      .single();

    if (!existingDJ) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 });
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

    // Validate file size (max 10MB for cover images)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Upload new image
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${params.djId}/cover/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const publicUrl = await uploadToStorage(
      "dj-images",
      fileName,
      file,
      file.type
    );

    // Update DJ profile with new image URL
    const { error: updateError } = await serviceSupabase
      .from("djs")
      .update({ cover_image_url: publicUrl })
      .eq("id", params.djId);

    if (updateError) {
      console.error("Error updating DJ profile:", updateError);
      // Try to delete uploaded file
      await deleteFromStorage("dj-images", fileName);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Delete old image if it exists
    if (existingDJ.cover_image_url) {
      const oldFileName = existingDJ.cover_image_url.split("/").slice(-2).join("/");
      // Only delete if it's from our bucket
      if (existingDJ.cover_image_url.includes("dj-images")) {
        await deleteFromStorage("dj-images", oldFileName).catch((err) => {
          console.error("Error deleting old cover:", err);
          // Don't fail the request if deletion fails
        });
      }
    }

    return NextResponse.json({ cover_url: publicUrl });
  } catch (error: any) {
    console.error("Error uploading cover:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



