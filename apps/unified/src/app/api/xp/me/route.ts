import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { UserRole } from "@crowdstack/shared";

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient(); // Use service role for XP queries
    
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

    // Helper to get XP directly from ledger - try BOTH schemas
    const getXpFromLedger = async () => {
      console.log("[XP/me] Querying xp_ledger for user:", user.id);
      
      // First, try NEW schema (user_id)
      const { data: newSchemaData, error: newSchemaError } = await serviceSupabase
        .from("xp_ledger")
        .select("amount")
        .eq("user_id", user.id);
      
      if (!newSchemaError && newSchemaData && newSchemaData.length > 0) {
        const totalXp = newSchemaData.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        console.log("[XP/me] Found via user_id (new schema):", newSchemaData.length, "entries, total XP:", totalXp);
        return totalXp;
      }
      
      if (newSchemaError) {
        console.log("[XP/me] New schema (user_id) failed:", newSchemaError.message);
      } else {
        console.log("[XP/me] No entries found with user_id, trying attendee lookup...");
      }
      
      // Try OLD schema (attendee_id) - need to look up attendee first
      const { data: attendeeData, error: attendeeError } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      
      if (attendeeError || !attendeeData) {
        console.log("[XP/me] No attendee found for user, returning 0 XP");
        return 0;
      }
      
      console.log("[XP/me] Found attendee_id:", attendeeData.id);
      
      const { data: oldSchemaData, error: oldSchemaError } = await serviceSupabase
        .from("xp_ledger")
        .select("amount")
        .eq("attendee_id", attendeeData.id);
      
      if (oldSchemaError) {
        console.log("[XP/me] Old schema (attendee_id) failed:", oldSchemaError.message);
        return 0;
      }
      
      const totalXp = (oldSchemaData || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
      console.log("[XP/me] Found via attendee_id (old schema):", oldSchemaData?.length || 0, "entries, total XP:", totalXp);
      return totalXp;
    };

    // Skip RPC functions (they may be out of sync), always use direct ledger query
    const totalXp = await getXpFromLedger();
    const level = Math.floor(totalXp / 100) + 1;
    const xpInLevel = totalXp % 100;
    
    viewResult = {
      total_xp: totalXp,
      level: level,
      xp_in_level: xpInLevel,
      xp_for_next_level: 100,
      progress_pct: xpInLevel,
      attendee_xp: totalXp,
      trust_score: totalXp, // for organizers
      performance_score: totalXp, // for promoters
      recent_activity: [],
    };
    
    console.log("[XP/me] Final XP result:", viewResult);

    // Also fetch badges using service role
    const { data: badges, error: badgesError } = await serviceSupabase
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

