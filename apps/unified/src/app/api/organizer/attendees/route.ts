import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { getOrganizerAttendees } from "@/lib/data/attendees-organizer";


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

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const event_id = searchParams.get("event_id") || undefined;
    const has_check_in = searchParams.get("has_check_in")
      ? searchParams.get("has_check_in") === "true"
      : undefined;

    const attendees = await getOrganizerAttendees(organizerId, {
      search,
      event_id,
      has_check_in,
    });

    return NextResponse.json({ attendees, organizerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attendees" }, { status: 500 });
  }
}

