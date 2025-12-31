import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export async function GET(
  request: Request,
  { params }: { params: { venueId: string } }
) {
  try {
    const { venueId } = params;

    // Verify admin access
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get venue with related data
    const { data: venue, error } = await serviceSupabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    if (error || !venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json({ venue });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch venue" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { venueId: string } }
) {
  try {
    const { venueId } = params;
    const body = await request.json();

    // Verify admin access
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Update venue
    const { data, error } = await serviceSupabase
      .from("venues")
      .update({
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || "US",
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", venueId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ venue: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update venue" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { venueId: string } }
) {
  try {
    const { venueId } = params;

    // Verify admin access
    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if venue has events
    const { count: eventsCount } = await serviceSupabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId);

    if (eventsCount && eventsCount > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete venue with existing events",
          eventsCount 
        },
        { status: 400 }
      );
    }

    // Delete venue
    const { error } = await serviceSupabase
      .from("venues")
      .delete()
      .eq("id", venueId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete venue" },
      { status: 500 }
    );
  }
}

