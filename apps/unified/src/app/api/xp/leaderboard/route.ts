import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

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

    // Get role filter from query params
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role") || "attendee";
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!["attendee", "promoter", "organizer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role parameter" },
        { status: 400 }
      );
    }

    // Get leaderboard based on role
    // For MVP, we'll use a simple query aggregating XP by role_context
    const { data: leaderboard, error } = await supabase
      .from("xp_ledger")
      .select(
        `
        user_id,
        amount,
        role_context,
        auth.users!inner (
          id,
          email,
          raw_user_meta_data
        )
      `
      )
      .eq("role_context", role)
      .limit(limit);

    if (error) {
      console.error("[XP/leaderboard] Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    // Aggregate by user_id
    const aggregated = (leaderboard || []).reduce(
      (acc: any, entry: any) => {
        const userId = entry.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            user: entry.auth.users,
            total_xp: 0,
          };
        }
        acc[userId].total_xp += entry.amount;
        return acc;
      },
      {} as Record<string, any>
    );

    // Convert to array and sort
    const leaderboardArray = Object.values(aggregated).sort(
      (a: any, b: any) => b.total_xp - a.total_xp
    );

    return NextResponse.json({
      role,
      leaderboard: leaderboardArray.slice(0, limit),
    });
  } catch (error) {
    console.error("[XP/leaderboard] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

