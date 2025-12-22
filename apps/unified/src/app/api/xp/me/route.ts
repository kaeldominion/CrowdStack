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
      // Handle JSONB response
      if (Array.isArray(data) && data.length > 0) {
        viewResult = data[0];
      } else if (data && typeof data === 'object') {
        viewResult = data;
      } else {
        viewResult = { total_xp: 0, trust_score: 0 };
      }
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
      // Handle JSONB response
      if (Array.isArray(data) && data.length > 0) {
        viewResult = data[0];
      } else if (data && typeof data === 'object') {
        viewResult = data;
      } else {
        viewResult = { total_xp: 0, performance_score: 0 };
      }
    } else {
      // Default to attendee view
      const { data, error } = await supabase.rpc("get_attendee_xp_view", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("[XP/me] Error fetching attendee XP view:", error);
        // Fallback: calculate XP directly from ledger
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("xp_ledger")
          .select("amount, role_context, source_type, description, created_at")
          .eq("user_id", user.id);
        
        if (ledgerError) {
          console.error("[XP/me] Error fetching XP ledger:", ledgerError);
          return NextResponse.json(
            { error: "Failed to fetch XP data" },
            { status: 500 }
          );
        }
        
        console.log("[XP/me] Fallback: Found", ledgerData?.length || 0, "XP ledger entries for user", user.id);
        
        const totalXp = (ledgerData || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
        const attendeeXp = (ledgerData || [])
          .filter(e => e.role_context === 'attendee')
          .reduce((sum, entry) => sum + (entry.amount || 0), 0);
        
        const recentActivity = (ledgerData || [])
          .filter(e => e.role_context === 'attendee')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(e => ({
            amount: e.amount,
            source: e.source_type,
            description: e.description,
            date: e.created_at,
          }));
        
        viewResult = {
          total_xp: totalXp,
          level: 0,
          xp_in_level: totalXp,
          xp_for_next_level: 100,
          progress_pct: 0,
          attendee_xp: attendeeXp,
          recent_activity: [],
        };
      } else {
        // RPC returns JSONB directly, but Supabase might wrap it
        // Handle both cases: direct JSONB or array with one element
        if (Array.isArray(data) && data.length > 0) {
          viewResult = data[0];
        } else if (data && typeof data === 'object') {
          viewResult = data;
        } else {
          console.error("[XP/me] Unexpected data format:", data);
          // Fallback calculation
          const { data: ledgerData } = await supabase
            .from("xp_ledger")
            .select("amount, role_context")
            .eq("user_id", user.id);
          const totalXp = (ledgerData || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
          const attendeeXp = (ledgerData || [])
            .filter(e => e.role_context === 'attendee')
            .reduce((sum, entry) => sum + (entry.amount || 0), 0);
          viewResult = { total_xp: totalXp, level: 0, attendee_xp: attendeeXp };
        }
        console.log("[XP/me] Attendee XP view result:", viewResult);
      }
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

