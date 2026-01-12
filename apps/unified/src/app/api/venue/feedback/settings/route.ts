import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/venue/feedback/settings
 * Get feedback settings for venue
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get or create feedback settings
    let { data: settings } = await serviceSupabase
      .from("event_feedback_settings")
      .select("*")
      .eq("venue_id", venueId)
      .single();

    // If no settings exist, create default
    if (!settings) {
      const { data: newSettings, error: insertError } = await serviceSupabase
        .from("event_feedback_settings")
        .insert({
          venue_id: venueId,
          enabled: true,
          delay_hours: 24,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Feedback Settings] Error creating settings:", insertError);
        return NextResponse.json(
          { error: "Failed to create settings" },
          { status: 500 }
        );
      }

      settings = newSettings;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("[Feedback Settings API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/venue/feedback/settings
 * Update feedback settings for venue
 * Venue admins only
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { enabled, delay_hours } = body;

    // Validate
    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    if (typeof delay_hours !== "number" || delay_hours < 0 || delay_hours > 168) {
      return NextResponse.json(
        { error: "delay_hours must be between 0 and 168" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Update or create settings
    const { data: existingSettings } = await serviceSupabase
      .from("event_feedback_settings")
      .select("id")
      .eq("venue_id", venueId)
      .single();

    if (existingSettings) {
      // Update existing
      const { data: settings, error: updateError } = await serviceSupabase
        .from("event_feedback_settings")
        .update({
          enabled,
          delay_hours,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSettings.id)
        .select()
        .single();

      if (updateError) {
        console.error("[Feedback Settings] Error updating:", updateError);
        return NextResponse.json(
          { error: "Failed to update settings" },
          { status: 500 }
        );
      }

      return NextResponse.json({ settings });
    } else {
      // Create new
      const { data: settings, error: insertError } = await serviceSupabase
        .from("event_feedback_settings")
        .insert({
          venue_id: venueId,
          enabled,
          delay_hours,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[Feedback Settings] Error creating:", insertError);
        return NextResponse.json(
          { error: "Failed to create settings" },
          { status: 500 }
        );
      }

      return NextResponse.json({ settings });
    }
  } catch (error: any) {
    console.error("[Feedback Settings API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
