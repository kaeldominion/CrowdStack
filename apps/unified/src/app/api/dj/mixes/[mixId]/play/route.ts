import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";

/**
 * POST /api/dj/mixes/[mixId]/play
 * Track a mix play event (optional analytics)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { mixId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceSupabase = createServiceRoleClient();

    // Verify mix exists (public can play published mixes)
    const { data: mix } = await serviceSupabase
      .from("mixes")
      .select("id, dj_id, plays_count")
      .eq("id", params.mixId)
      .single();

    if (!mix) {
      return NextResponse.json({ error: "Mix not found" }, { status: 404 });
    }

    // Record play event (optional - user_id can be null for anonymous plays)
    await serviceSupabase
      .from("mix_plays")
      .insert({
        mix_id: params.mixId,
        user_id: user?.id || null,
      });

    // Increment play count
    await serviceSupabase
      .from("mixes")
      .update({
        plays_count: (mix.plays_count || 0) + 1,
      })
      .eq("id", params.mixId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error tracking mix play:", error);
    // Don't fail the request if analytics tracking fails
    return NextResponse.json({ success: true });
  }
}



