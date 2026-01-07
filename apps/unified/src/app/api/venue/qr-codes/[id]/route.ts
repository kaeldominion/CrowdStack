import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueIds } from "@/lib/data/get-user-entity";

/**
 * PATCH /api/venue/qr-codes/[id]
 * Update a QR code (must belong to the venue)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const serviceSupabase = createServiceRoleClient();

    // Verify QR code belongs to one of the user's venues
    const { data: existing } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("venue_id")
      .eq("id", params.id)
      .single();

    if (!existing || (existing.venue_id && !venueIds.includes(existing.venue_id))) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, target_url } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description || null;
    if (target_url !== undefined) {
      try {
        new URL(target_url);
        updateData.target_url = target_url;
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("[QR Codes API] Error updating QR code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ qrCode });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/qr-codes/[id]
 * Delete a QR code (must belong to the venue)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const serviceSupabase = createServiceRoleClient();

    // Verify QR code belongs to one of the user's venues
    const { data: existing } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("venue_id")
      .eq("id", params.id)
      .single();

    if (!existing || (existing.venue_id && !venueIds.includes(existing.venue_id))) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const { error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("[QR Codes API] Error deleting QR code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

