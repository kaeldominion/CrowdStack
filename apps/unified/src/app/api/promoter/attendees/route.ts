import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";
import { getPromoterAttendees } from "@/lib/data/attendees-promoter";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const event_id = searchParams.get("event_id") || undefined;
    const category = searchParams.get("category") as "referrals" | "upcoming" | "all" | null;

    const attendees = await getPromoterAttendees(promoterId, {
      search,
      event_id,
      category: category || undefined,
    });

    return NextResponse.json(attendees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attendees" }, { status: 500 });
  }
}

