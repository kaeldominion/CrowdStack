import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/venue/tables/[tableId]
 * Update a table
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tableId: string } }
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

    const { tableId } = params;
    const body = await request.json();
    const { zone_id, name, capacity, notes, minimum_spend, deposit_amount, is_active, display_order } = body;

    const serviceSupabase = createServiceRoleClient();

    // Verify the table belongs to this venue
    const { data: existingTable, error: fetchError } = await serviceSupabase
      .from("venue_tables")
      .select("id, venue_id")
      .eq("id", tableId)
      .single();

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (existingTable.venue_id !== venueId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If zone_id is being changed, verify the new zone belongs to this venue
    if (zone_id !== undefined) {
      const { data: zone, error: zoneError } = await serviceSupabase
        .from("table_zones")
        .select("id, venue_id")
        .eq("id", zone_id)
        .single();

      if (zoneError || !zone) {
        return NextResponse.json({ error: "Zone not found" }, { status: 404 });
      }

      if (zone.venue_id !== venueId) {
        return NextResponse.json({ error: "Zone does not belong to this venue" }, { status: 403 });
      }
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (zone_id !== undefined) {
      updates.zone_id = zone_id;
    }
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Table name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }
    if (capacity !== undefined) {
      if (typeof capacity !== "number" || capacity < 1) {
        return NextResponse.json(
          { error: "Valid capacity is required" },
          { status: 400 }
        );
      }
      updates.capacity = capacity;
    }
    if (notes !== undefined) {
      updates.notes = notes?.trim() || null;
    }
    if (minimum_spend !== undefined) {
      updates.minimum_spend = minimum_spend || null;
    }
    if (deposit_amount !== undefined) {
      updates.deposit_amount = deposit_amount || null;
    }
    if (is_active !== undefined) {
      updates.is_active = is_active;
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

    const { data: table, error } = await serviceSupabase
      .from("venue_tables")
      .update(updates)
      .eq("id", tableId)
      .select(`
        *,
        zone:table_zones(id, name)
      `)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A table with this name already exists" },
          { status: 409 }
        );
      }
      console.error("[Tables API] Error updating table:", error);
      throw error;
    }

    return NextResponse.json({ table });
  } catch (error: any) {
    console.error("[Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update table" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/tables/[tableId]
 * Delete a table
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tableId: string } }
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

    const { tableId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the table belongs to this venue
    const { data: existingTable, error: fetchError } = await serviceSupabase
      .from("venue_tables")
      .select("id, venue_id")
      .eq("id", tableId)
      .single();

    if (fetchError || !existingTable) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (existingTable.venue_id !== venueId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the table
    const { error } = await serviceSupabase
      .from("venue_tables")
      .delete()
      .eq("id", tableId);

    if (error) {
      console.error("[Tables API] Error deleting table:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Tables API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete table" },
      { status: 500 }
    );
  }
}
