import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { deleteFromStorage } from "@crowdstack/shared/storage/upload";
import { cookies } from "next/headers";

/**
 * DELETE /api/dj/gallery/[imageId]
 * Delete specific gallery image
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { imageId: string } }
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

    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Verify image exists and get DJ ID
    const { data: image, error: imageError } = await serviceSupabase
      .from("dj_gallery")
      .select("dj_id, storage_path, thumbnail_path")
      .eq("id", params.imageId)
      .single();

    if (imageError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Check permissions: must be superadmin or the DJ owner
    if (!isSuperadmin) {
      const { data: dj } = await serviceSupabase
        .from("djs")
        .select("user_id")
        .eq("id", image.dj_id)
        .single();

      if (!dj || dj.user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Delete from storage
    try {
      await deleteFromStorage("dj-images", image.storage_path);
      if (image.thumbnail_path && image.thumbnail_path !== image.storage_path) {
        await deleteFromStorage("dj-images", image.thumbnail_path);
      }
    } catch (storageError) {
      console.error("Failed to delete from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await serviceSupabase
      .from("dj_gallery")
      .delete()
      .eq("id", params.imageId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete gallery image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}

