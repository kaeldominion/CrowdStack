import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { UserRole } from "@crowdstack/shared";

export async function POST(request: NextRequest) {
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

    // Check if user is organizer or venue admin
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      return NextResponse.json(
        { error: "Failed to verify permissions" },
        { status: 500 }
      );
    }

    const roles = (userRoles || []).map((r) => r.role as UserRole);
    const canAward = roles.includes("event_organizer") || 
                     roles.includes("venue_admin") ||
                     roles.includes("superadmin");

    if (!canAward) {
      return NextResponse.json(
        { error: "Insufficient permissions to award badges" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { badge_id, user_id: targetUserId, metadata = {} } = body;

    if (!badge_id || !targetUserId) {
      return NextResponse.json(
        { error: "Missing required fields: badge_id, user_id" },
        { status: 400 }
      );
    }

    // Verify badge is giftable
    const { data: badge, error: badgeError } = await supabase
      .from("badges")
      .select("id, is_giftable")
      .eq("id", badge_id)
      .single();

    if (badgeError || !badge) {
      return NextResponse.json(
        { error: "Badge not found" },
        { status: 404 }
      );
    }

    if (!badge.is_giftable) {
      return NextResponse.json(
        { error: "This badge cannot be awarded manually" },
        { status: 400 }
      );
    }

    // Check if user already has this badge
    const { data: existing, error: existingError } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("badge_id", badge_id)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      // PGRST116 is "not found" which is fine
      console.error("[Badges/award] Error checking existing badge:", existingError);
      return NextResponse.json(
        { error: "Failed to check existing badge" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "User already has this badge" },
        { status: 400 }
      );
    }

    // Award the badge
    const { data: userBadge, error: awardError } = await supabase
      .from("user_badges")
      .insert({
        user_id: targetUserId,
        badge_id: badge_id,
        awarded_by: user.id,
        metadata: metadata,
      })
      .select()
      .single();

    if (awardError) {
      console.error("[Badges/award] Error awarding badge:", awardError);
      return NextResponse.json(
        { error: "Failed to award badge" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user_badge: userBadge,
    });
  } catch (error) {
    console.error("[Badges/award] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

