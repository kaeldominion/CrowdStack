import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { getVenueFlags } from "@/lib/data/flags";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const flags = await getVenueFlags(venueId);

    return NextResponse.json({ flags });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch flags" },
      { status: 500 }
    );
  }
}

