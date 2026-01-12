import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

/**
 * POST /api/promoter/profile/ensure
 * Ensure a promoter profile exists for the current user
 * Creates one if it doesn't exist
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

    const serviceSupabase = createServiceRoleClient();

    // Check if promoter profile already exists (check both user_id and created_by)
    let { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!promoter) {
      // Fallback: check created_by
      const { data: promoterByCreator } = await serviceSupabase
        .from("promoters")
        .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
        .eq("created_by", user.id)
        .maybeSingle();
      
      promoter = promoterByCreator;
    }

    // If profile exists, return it
    if (promoter) {
      return NextResponse.json(
        { promoter },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Profile doesn't exist - create it
    // Get attendee name if available, otherwise use email username
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("name, email, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const promoterName = attendee?.name || 
                        user.user_metadata?.full_name || 
                        user.user_metadata?.name ||
                        (user.email ? user.email.split("@")[0] : "Promoter");

    // Create promoter profile
    const { data: newPromoter, error: createError } = await serviceSupabase
      .from("promoters")
      .insert({
        user_id: user.id,
        name: promoterName,
        email: attendee?.email || user.email || null,
        phone: attendee?.phone || null,
        status: "active",
        created_by: user.id,
      })
      .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
      .single();

    if (createError || !newPromoter) {
      console.error("Failed to create promoter profile:", createError);
      return NextResponse.json(
        { error: createError?.message || "Failed to create promoter profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { promoter: newPromoter },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error("Error ensuring promoter profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ensure promoter profile" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
