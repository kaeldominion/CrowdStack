import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";
import { getPromoterAttendees } from "@/lib/data/attendees-promoter";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
    const categoryParam = searchParams.get("category");
    
    // Filter category to only allow "upcoming" | "all" (matching PromoterAttendeeFilters type)
    const category = (categoryParam === "upcoming" || categoryParam === "all") 
      ? categoryParam 
      : undefined;

    const attendees = await getPromoterAttendees(promoterId, {
      search,
      event_id,
      category,
    });

    return NextResponse.json(attendees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attendees" }, { status: 500 });
  }
}

