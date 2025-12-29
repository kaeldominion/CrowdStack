import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

/**
 * GET /api/dj/mixes/[mixId]
 * Get a specific mix
 */
export async function GET(
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

    const { data: mix, error } = await serviceSupabase
      .from("mixes")
      .select("*")
      .eq("id", params.mixId)
      .eq("dj_id", djId)
      .single();

    if (error || !mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    return NextResponse.json({ mix });
  } catch (error: any) {
    console.error("Error fetching mix:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dj/mixes/[mixId]
 * Update a mix
 * Query params: ?djId=xxx (optional, for admin access)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { mixId: string } }
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
    
    // Check if user is superadmin
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

    // Verify mix belongs to DJ
    const { data: existingMix } = await serviceSupabase
      .from("mixes")
      .select("id, status, published_at, is_featured")
      .eq("id", params.mixId)
      .eq("dj_id", djId)
      .single();

    if (!existingMix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      soundcloud_url,
      cover_image_url,
      status,
      display_order,
      is_featured,
    } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (soundcloud_url !== undefined) {
      // Normalize the SoundCloud URL (resolves shortlinks to full URLs)
      let normalizedSoundcloudUrl = soundcloud_url.trim();
      try {
        const { normalizeSoundCloudUrl } = await import("@/lib/utils/soundcloud-metadata");
        const normalized = await normalizeSoundCloudUrl(soundcloud_url.trim());
        if (normalized) {
          normalizedSoundcloudUrl = normalized;
        } else {
          return NextResponse.json({ error: "Invalid SoundCloud URL. Please use a full SoundCloud track URL." }, { status: 400 });
        }
      } catch (normalizeError) {
        console.error("Error normalizing SoundCloud URL:", normalizeError);
        return NextResponse.json({ error: "Failed to validate SoundCloud URL. Please check the URL and try again." }, { status: 400 });
      }

      updateData.soundcloud_url = normalizedSoundcloudUrl;
      
      // If SoundCloud URL changed and title/description not provided, fetch metadata
      if ((!title && !description) || (!title && description === undefined)) {
        try {
          const { fetchSoundCloudMetadata } = await import("@/lib/utils/soundcloud-metadata");
          const metadata = await fetchSoundCloudMetadata(normalizedSoundcloudUrl);
          
          if (metadata) {
            updateData.title = metadata.title || "Untitled Mix";
            updateData.description = metadata.description || null;
          }
        } catch (metadataError) {
          console.error("Error fetching SoundCloud metadata:", metadataError);
          // Continue without metadata update
        }
      }
      
      // Update embed URL (use normalized URL)
      const soundcloudEmbedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(normalizedSoundcloudUrl)}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;
      updateData.soundcloud_embed_url = soundcloudEmbedUrl;
    }
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url?.trim() || null;
    if (display_order !== undefined) updateData.display_order = display_order;
    
    // Handle is_featured - only one mix can be featured at a time
    if (is_featured !== undefined) {
      updateData.is_featured = is_featured;
      
      // If setting as featured, unset any other featured mixes for this DJ
      if (is_featured === true) {
        await serviceSupabase
          .from("mixes")
          .update({ is_featured: false })
          .eq("dj_id", djId)
          .neq("id", params.mixId);
      }
    }

    if (status !== undefined) {
      updateData.status = status === "published" ? "published" : "draft";
      // Set published_at if transitioning from draft to published
      if (status === "published" && existingMix.status === "draft" && !existingMix.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: updatedMix, error: updateError } = await serviceSupabase
      .from("mixes")
      .update(updateData)
      .eq("id", params.mixId)
      .select()
      .single();

    if (updateError || !updatedMix) {
      console.error("Error updating mix:", updateError);
      return NextResponse.json({ error: "Failed to update mix" }, { status: 500 });
    }

    return NextResponse.json({ mix: updatedMix });
  } catch (error: any) {
    console.error("Error updating mix:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dj/mixes/[mixId]
 * Delete a mix
 * Query params: ?djId=xxx (optional, for admin access)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { mixId: string } }
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

    // Verify mix belongs to DJ
    const { data: existingMix } = await serviceSupabase
      .from("mixes")
      .select("id")
      .eq("id", params.mixId)
      .eq("dj_id", djId)
      .single();

    if (!existingMix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    const { error: deleteError } = await serviceSupabase
      .from("mixes")
      .delete()
      .eq("id", params.mixId);

    if (deleteError) {
      console.error("Error deleting mix:", deleteError);
      return NextResponse.json({ error: "Failed to delete mix" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting mix:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

