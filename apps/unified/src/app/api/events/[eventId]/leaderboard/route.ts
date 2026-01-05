import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const localhostUser = cookieStore.get("localhost_user_id")?.value;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const eventId = params.eventId;

    // Get all promoters assigned to this event
    const { data: eventPromoters, error: epError } = await serviceClient
      .from("event_promoters")
      .select(`
        promoter_id,
        promoter:promoters(id, name, email)
      `)
      .eq("event_id", eventId);

    if (epError) {
      console.error("Error fetching event promoters:", epError);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    if (!eventPromoters || eventPromoters.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Get all registrations for this event
    const { data: registrations, error: regError } = await serviceClient
      .from("registrations")
      .select("id, referral_promoter_id")
      .eq("event_id", eventId);

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    // Get check-ins directly from checkins table (more reliable than embedded join)
    const registrationIds = registrations?.map((r) => r.id) || [];
    const { data: checkins } = await serviceClient
      .from("checkins")
      .select("registration_id")
      .in("registration_id", registrationIds.length > 0 ? registrationIds : ["none"])
      .is("undo_at", null);

    // Build a set of checked-in registration IDs
    const checkedInRegIds = new Set(checkins?.map((c) => c.registration_id) || []);

    // Calculate stats for each promoter
    const promoterStats: Record<string, { referrals: number; checkins: number }> = {};

    for (const reg of registrations || []) {
      if (reg.referral_promoter_id) {
        if (!promoterStats[reg.referral_promoter_id]) {
          promoterStats[reg.referral_promoter_id] = { referrals: 0, checkins: 0 };
        }
        promoterStats[reg.referral_promoter_id].referrals += 1;
        
        if (checkedInRegIds.has(reg.id)) {
          promoterStats[reg.referral_promoter_id].checkins += 1;
        }
      }
    }

    // Build leaderboard array
    const leaderboard = eventPromoters.map((ep: any) => {
      const stats = promoterStats[ep.promoter_id] || { referrals: 0, checkins: 0 };
      return {
        promoter_id: ep.promoter_id,
        name: ep.promoter?.name || ep.promoter?.email?.split("@")[0] || "Unknown",
        email: ep.promoter?.email || "",
        referrals: stats.referrals,
        checkins: stats.checkins,
        conversion_rate: stats.referrals > 0 
          ? Math.round((stats.checkins / stats.referrals) * 100) 
          : 0,
      };
    });

    // Sort by check-ins (primary) then referrals (secondary)
    leaderboard.sort((a: any, b: any) => {
      if (b.checkins !== a.checkins) return b.checkins - a.checkins;
      return b.referrals - a.referrals;
    });

    // Add rank
    leaderboard.forEach((entry: any, index: number) => {
      entry.rank = index + 1;
    });

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: error?.message },
      { status: 500 }
    );
  }
}

