import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/me/promoter-status
 * Check if the current user is a promoter and their assignment status for an event
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ isPromoter: false, isAssigned: false });
    }

    const eventId = request.nextUrl.searchParams.get("eventId");
    
    // Use service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    
    // Check if user is a promoter (check both user_id and created_by for compatibility)
    let { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // Fallback to created_by if not found by user_id
    if (!promoter) {
      const { data: createdPromoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("created_by", user.id)
        .single();
      promoter = createdPromoter;
    }

    if (!promoter) {
      return NextResponse.json({ isPromoter: false, isAssigned: false });
    }

    // If no eventId provided, just return promoter status
    if (!eventId) {
      return NextResponse.json({ isPromoter: true, isAssigned: false, promoterId: promoter.id });
    }

    // Check if already assigned to this event
    const { data: assignment } = await serviceSupabase
      .from("event_promoters")
      .select("id")
      .eq("event_id", eventId)
      .eq("promoter_id", promoter.id)
      .single();

    return NextResponse.json({
      isPromoter: true,
      isAssigned: !!assignment,
      promoterId: promoter.id
    });
  } catch {
    return NextResponse.json({ isPromoter: false, isAssigned: false });
  }
}

