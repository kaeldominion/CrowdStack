import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/venue/zones/[zoneId]
 * Update a table zone
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { zoneId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { zoneId } = params;
    const body = await request.json();
    const { name, description, display_order } = body;

    const serviceSupabase = createServiceRoleClient();

    // Verify the zone belongs to this venue
    const { data: existingZone, error: fetchError } = await serviceSupabase
      .from("table_zones")
      .select("id, venue_id")
      .eq("id", zoneId)
      .single();

    if (fetchError || !existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (existingZone.venue_id !== venueId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, any> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Zone name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }
    if (display_order !== undefined) {
      updates.display_order = display_order;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: zone, error } = await serviceSupabase
      .from("table_zones")
      .update(updates)
      .eq("id", zoneId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A zone with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Zones API] Error updating zone:", error);
      throw error;
    }

    return NextResponse.json({ zone });
  } catch (error: any) {
    console.error("[Zones API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update zone" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/zones/[zoneId]
 * Delete a table zone (cascade deletes all tables in the zone)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { zoneId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { zoneId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the zone belongs to this venue
    const { data: existingZone, error: fetchError } = await serviceSupabase
      .from("table_zones")
      .select("id, venue_id")
      .eq("id", zoneId)
      .single();

    if (fetchError || !existingZone) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    if (existingZone.venue_id !== venueId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the zone (cascade will delete tables)
    const { error } = await serviceSupabase
      .from("table_zones")
      .delete()
      .eq("id", zoneId);

    if (error) {
      console.error("[Zones API] Error deleting zone:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Zones API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete zone" },
      { status: 500 }
    );
  }
}
