import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/settings
 * Get organizer settings (profile + team members)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get organizer profile
    const { data: organizer, error: organizerError } = await serviceSupabase
      .from("organizers")
      .select("*")
      .eq("id", organizerId)
      .single();

    if (organizerError || !organizer) {
      return NextResponse.json(
        { error: "Failed to fetch organizer" },
        { status: 500 }
      );
    }

    // Get team members
    const { data: teamMembers } = await serviceSupabase
      .from("organizer_team_members")
      .select("*")
      .eq("organizer_id", organizerId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    return NextResponse.json({
      organizer: {
        ...organizer,
        team_members: teamMembers || [],
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch organizer settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizer/settings
 * Update organizer profile
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

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { organizer } = body;

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer data required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Update organizer profile (only allow specific fields)
    const updateData: any = {};
    const allowedFields = [
      "name",
      "company_name",
      "bio",
      "website",
      "instagram_url",
      "twitter_url",
      "facebook_url",
      "logo_url",
    ];

    for (const field of allowedFields) {
      if (field in organizer) {
        updateData[field] = organizer[field] || null;
      }
    }

    const { error: updateError } = await serviceSupabase
      .from("organizers")
      .update(updateData)
      .eq("id", organizerId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update organizer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update organizer settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}

