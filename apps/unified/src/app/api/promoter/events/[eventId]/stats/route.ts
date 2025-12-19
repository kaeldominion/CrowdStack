import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/service";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Check for localhost development mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get the promoter for this user
    const { data: promoter } = await serviceClient
      .from("promoters")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!promoter) {
      return NextResponse.json(
        { error: "Promoter profile not found" },
        { status: 403 }
      );
    }

    // Get registrations referred by this promoter for this event
    const { data: registrations, error: regError } = await serviceClient
      .from("registrations")
      .select("id, attendee_id, checked_in")
      .eq("event_id", params.eventId)
      .eq("referral_promoter_id", promoter.id);

    if (regError) {
      console.error("Error fetching registrations:", regError);
      return NextResponse.json(
        { error: "Failed to fetch stats" },
        { status: 500 }
      );
    }

    const referrals = registrations?.length || 0;
    const checkins = registrations?.filter((r) => r.checked_in).length || 0;
    const conversionRate = referrals > 0 ? (checkins / referrals) * 100 : 0;

    return NextResponse.json({
      referrals,
      checkins,
      conversionRate,
    });
  } catch (error) {
    console.error("Error fetching promoter stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

