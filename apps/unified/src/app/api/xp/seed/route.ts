import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/xp/seed
 * DEV ONLY: Seed test XP for the current user
 * Body: { amount: number }
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 });
    }

    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const amount = body.amount || 100;

    // Insert XP entry using NEW schema (user_id)
    const { data: xpEntry, error } = await serviceSupabase
      .from("xp_ledger")
      .insert({
        user_id: user.id,
        amount: amount,
        source_type: "PROFILE_COMPLETION",
        role_context: "attendee",
        description: "Test XP (dev seed)",
      })
      .select()
      .single();

    if (error) {
      console.error("[XP/seed] Error inserting XP:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[XP/seed] Added", amount, "XP to user", user.id);
    
    return NextResponse.json({ 
      success: true, 
      xp_added: amount,
      entry: xpEntry,
    });
  } catch (error: any) {
    console.error("[XP/seed] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

