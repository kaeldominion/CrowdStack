import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";

// GET - List pre-approved organizers for the venue

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all partnerships for this venue with organizer details
    const { data: partnerships, error } = await serviceSupabase
      .from("venue_organizer_partnerships")
      .select(`
        id,
        auto_approve,
        created_at,
        created_by,
        organizer:organizers(id, name, email)
      `)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get event counts for each organizer at this venue
    const partnershipsWithCounts = await Promise.all(
      (partnerships || []).map(async (p) => {
        const organizer = Array.isArray(p.organizer) ? p.organizer[0] : p.organizer;
        const { count } = await serviceSupabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venueId)
          .eq("organizer_id", organizer?.id);

        return {
          ...p,
          events_count: count || 0,
        };
      })
    );

    return NextResponse.json({ partnerships: partnershipsWithCounts });
  } catch (error: any) {
    console.error("Error fetching pre-approved organizers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pre-approved organizers" },
      { status: 500 }
    );
  }
}

// POST - Add an organizer to pre-approved list
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const body = await request.json();
    const { organizer_id, auto_approve = true } = body;

    if (!organizer_id) {
      return NextResponse.json({ error: "organizer_id is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if partnership already exists
    const { data: existing } = await serviceSupabase
      .from("venue_organizer_partnerships")
      .select("id")
      .eq("venue_id", venueId)
      .eq("organizer_id", organizer_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Organizer is already pre-approved" }, { status: 400 });
    }

    // Create partnership
    const { data: partnership, error } = await serviceSupabase
      .from("venue_organizer_partnerships")
      .insert({
        venue_id: venueId,
        organizer_id,
        auto_approve,
        created_by: user.id,
      })
      .select(`
        id,
        auto_approve,
        created_at,
        organizer:organizers(id, name, email)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ partnership });
  } catch (error: any) {
    console.error("Error adding pre-approved organizer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add pre-approved organizer" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an organizer from pre-approved list
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const partnershipId = searchParams.get("id");

    if (!partnershipId) {
      return NextResponse.json({ error: "Partnership ID is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the partnership belongs to this venue
    const { data: partnership } = await serviceSupabase
      .from("venue_organizer_partnerships")
      .select("id, venue_id")
      .eq("id", partnershipId)
      .single();

    if (!partnership) {
      return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
    }

    if (partnership.venue_id !== venueId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete partnership
    const { error } = await serviceSupabase
      .from("venue_organizer_partnerships")
      .delete()
      .eq("id", partnershipId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing pre-approved organizer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove pre-approved organizer" },
      { status: 500 }
    );
  }
}

