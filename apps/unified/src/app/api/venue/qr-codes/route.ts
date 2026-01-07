import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/venue/qr-codes
 * List QR codes for the current venue(s)
 */
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ 
        error: "Forbidden - Venue admin role required"
      }, { status: 403 });
    }

    const venueIds = await getUserVenueIds();
    if (venueIds.length === 0) {
      return NextResponse.json({ qrCodes: [] });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCodes, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("*")
      .in("venue_id", venueIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[QR Codes API] Error fetching QR codes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ qrCodes: qrCodes || [] });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venue/qr-codes
 * Create a new QR code for the current venue
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ 
        error: "Forbidden - Venue admin role required"
      }, { status: 403 });
    }

    const venueIds = await getUserVenueIds();
    if (venueIds.length === 0) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, target_url, venue_id } = body;

    if (!code || !name || !target_url) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, target_url" },
        { status: 400 }
      );
    }

    // Use provided venue_id if it's one the user has access to, otherwise use first
    const selectedVenueId = venue_id && venueIds.includes(venue_id)
      ? venue_id
      : venueIds[0];

    // Validate code format
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only alphanumeric characters, hyphens, and underscores" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(target_url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .insert({
        code,
        name,
        target_url,
        venue_id: selectedVenueId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A QR code with this code already exists" },
          { status: 409 }
        );
      }
      console.error("[QR Codes API] Error creating QR code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ qrCode }, { status: 201 });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

