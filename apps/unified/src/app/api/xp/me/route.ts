import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { UserRole } from "@crowdstack/shared";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's roles
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("[XP/me] Error fetching user roles:", rolesError);
      return NextResponse.json(
        { error: "Failed to fetch user roles" },
        { status: 500 }
      );
    }

    const roles = (userRoles || []).map((r) => r.role as UserRole);

    // Determine which view to use based on primary role
    // Priority: organizer > promoter > attendee
    let viewResult: any;

    if (roles.includes("event_organizer")) {
      const { data, error } = await supabase.rpc("get_organizer_xp_view", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("[XP/me] Error fetching organizer XP view:", error);
        return NextResponse.json(
          { error: "Failed to fetch XP data" },
          { status: 500 }
        );
      }
      viewResult = data;
    } else if (roles.includes("promoter")) {
      const { data, error } = await supabase.rpc("get_promoter_xp_view", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("[XP/me] Error fetching promoter XP view:", error);
        return NextResponse.json(
          { error: "Failed to fetch XP data" },
          { status: 500 }
        );
      }
      viewResult = data;
    } else {
      // Default to attendee view
      const { data, error } = await supabase.rpc("get_attendee_xp_view", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("[XP/me] Error fetching attendee XP view:", error);
        return NextResponse.json(
          { error: "Failed to fetch XP data" },
          { status: 500 }
        );
      }
      viewResult = data;
    }

    // Also fetch badges
    const { data: badges, error: badgesError } = await supabase
      .from("user_badges")
      .select(
        `
        id,
        awarded_at,
        metadata,
        badges (
          id,
          name,
          description,
          icon_url,
          badge_category,
          target_role
        )
      `
      )
      .eq("user_id", user.id)
      .order("awarded_at", { ascending: false });

    if (badgesError) {
      console.error("[XP/me] Error fetching badges:", badgesError);
      // Don't fail the request if badges fail
    }

    return NextResponse.json({
      ...viewResult,
      badges: badges || [],
      roles,
    });
  } catch (error) {
    console.error("[XP/me] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

