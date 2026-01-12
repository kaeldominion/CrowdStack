import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

/**
 * GET /api/promoter/profile
 * Get the current user's promoter profile
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if promoter profile exists (check both user_id and created_by)
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

    if (!promoter) {
      return NextResponse.json(
        { error: "Promoter profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { promoter },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching promoter profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoter profile" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

/**
 * PATCH /api/promoter/profile
 * Update the current user's promoter profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get current promoter to check slug for revalidation
    let { data: currentPromoter } = await serviceSupabase
      .from("promoters")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentPromoter) {
      const { data: promoterByCreator } = await serviceSupabase
        .from("promoters")
        .select("slug")
        .eq("created_by", user.id)
        .maybeSingle();
      currentPromoter = promoterByCreator;
    }

    if (!currentPromoter) {
      return NextResponse.json(
        { error: "Promoter profile not found" },
        { status: 404 }
      );
    }

    // Update the profile
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.slug !== undefined) updateData.slug = body.slug || null;
    if (body.bio !== undefined) updateData.bio = body.bio || null;
    if (body.instagram_handle !== undefined) updateData.instagram_handle = body.instagram_handle || null;
    if (body.whatsapp_number !== undefined) updateData.whatsapp_number = body.whatsapp_number || null;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedPromoter, error: updateError } = await serviceSupabase
      .from("promoters")
      .update(updateData)
      .eq("user_id", user.id)
      .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
      .single();

    if (updateError) {
      // If user_id didn't work, try created_by
      if (updateError.code === 'PGRST116') {
        const { data: updatedByCreator, error: creatorError } = await serviceSupabase
          .from("promoters")
          .update(updateData)
          .eq("created_by", user.id)
          .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
          .single();

        if (creatorError) {
          console.error("Error updating promoter profile:", creatorError);
          return NextResponse.json(
            { error: creatorError.message || "Failed to update profile" },
            { status: 500 }
          );
        }

        // Note: revalidatePath doesn't work in API routes
        // The page uses dynamic = 'force-dynamic' and noStore() to always fetch fresh data

        return NextResponse.json(
          { promoter: updatedByCreator },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          }
        );
      }

      console.error("Error updating promoter profile:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update profile" },
        { status: 500 }
      );
    }

    // Note: revalidatePath doesn't work in API routes
    // The page uses dynamic = 'force-dynamic' and noStore() to always fetch fresh data

    return NextResponse.json(
      { promoter: updatedPromoter },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error updating promoter profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update promoter profile" },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
