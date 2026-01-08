import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";
import { cookies } from "next/headers";

/**
 * GET /api/dj/gallery
 * List gallery images for DJ
 * Query params: ?djId=xxx (optional, for admin/public access)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const djIdParam = searchParams.get("djId");
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let djId: string | null = null;
    let isSuperadmin = false;

    // If djId is provided, check if user is admin or the DJ owner
    if (djIdParam) {
      const cookieStore = await cookies();
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

      if (userId) {
        const serviceSupabase = createServiceRoleClient();
        const { data: userRoles } = await serviceSupabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        
        const roles = userRoles?.map((r) => r.role) || [];
        isSuperadmin = roles.includes("superadmin");
      }

      djId = djIdParam;
    } else {
      // Get current user's DJ ID
      djId = await getUserDJId();
      if (!djId) {
        return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
      }
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: gallery, error } = await serviceSupabase
      .from("dj_gallery")
      .select("*")
      .eq("dj_id", djId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching gallery:", error);
      return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
    }

    return NextResponse.json({ gallery: gallery || [] });
  } catch (error: any) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dj/gallery
 * Upload new gallery image
 * Query params: ?djId=xxx (optional, for admin access)
 */
export async function POST(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const djIdParam = searchParams.get("djId");
    
    let djId: string | null = null;
    
    if (djIdParam && isSuperadmin) {
      djId = djIdParam;
    } else {
      djId = await getUserDJId();
      if (!djId) {
        return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caption = formData.get("caption") as string | null;
    const isHero = formData.get("is_hero") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${djId}/gallery/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "dj-images",
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Generate thumbnail path (same as storage path for now)
    const thumbnailPath = storagePath;

    // If setting as hero, unset other hero images
    if (isHero) {
      await serviceSupabase
        .from("dj_gallery")
        .update({ is_hero: false })
        .eq("dj_id", djId)
        .eq("is_hero", true);
    }

    // Get max display_order to append at end
    const { data: lastImage } = await serviceSupabase
      .from("dj_gallery")
      .select("display_order")
      .eq("dj_id", djId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const displayOrder = lastImage?.display_order ? lastImage.display_order + 1 : 0;

    // Insert gallery record
    const { data: galleryImage, error: insertError } = await serviceSupabase
      .from("dj_gallery")
      .insert({
        dj_id: djId,
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
      await deleteFromStorage("dj-images", storagePath);
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



