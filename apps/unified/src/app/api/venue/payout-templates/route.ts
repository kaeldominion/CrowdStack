import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import type { PromoterPayoutTemplate } from "@crowdstack/shared/types";

/**
 * GET /api/venue/payout-templates
 * Get all payout templates for the venue
 */

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

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = await getUserId();
    const serviceSupabase = createServiceRoleClient();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let templates;
    let error;

    if (isSuperadmin) {
      // Superadmins can see all templates
      const { data, error: err } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      templates = data;
      error = err;
    } else {
      // Regular venues see only their templates
      const venueId = await getUserVenueId();
      if (!venueId) {
        return NextResponse.json(
          { error: "No venue found for user" },
          { status: 404 }
        );
      }

      const { data, error: err } = await serviceSupabase
        .from("promoter_payout_templates")
        .select("*")
        .eq("venue_id", venueId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      templates = data;
      error = err;
    }

    if (error) {
      console.error("Error fetching payout templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error: any) {
    console.error("Failed to fetch payout templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venue/payout-templates
 * Create a new payout template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = await getUserId();
    const serviceSupabase = createServiceRoleClient();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    const body = await request.json();
    const {
      venue_id, // For superadmins to specify which venue
      name,
      description,
      currency,
      per_head_rate,
      per_head_min,
      per_head_max,
      fixed_fee,
      minimum_guests,
      below_minimum_percent,
      bonus_threshold,
      bonus_amount,
      bonus_tiers,
      is_default,
      table_commission_type,
      table_commission_rate,
      table_commission_flat_fee,
    } = body;

    // Determine venue_id
    let venueId: string;
    if (isSuperadmin && venue_id) {
      // Superadmin can specify venue_id
      venueId = venue_id;
      // Verify venue exists
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("id", venueId)
        .single();
      if (!venue) {
        return NextResponse.json(
          { error: "Venue not found" },
          { status: 404 }
        );
      }
    } else {
      // Regular venues use their own venue_id
      const userVenueId = await getUserVenueId();
      if (!userVenueId) {
        return NextResponse.json(
          { error: "No venue found for user" },
          { status: 404 }
        );
      }
      venueId = userVenueId;
    }

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await serviceSupabase
        .from("promoter_payout_templates")
        .update({ is_default: false })
        .eq("venue_id", venueId)
        .eq("is_default", true);
    }

    // Create the template
    const { data: template, error } = await serviceSupabase
      .from("promoter_payout_templates")
      .insert({
        venue_id: venueId,
        organizer_id: null, // Explicitly set to null for venue templates
        name: name.trim(),
        description: description?.trim() || null,
        currency: currency || null,
        per_head_rate: per_head_rate !== undefined && per_head_rate !== null && per_head_rate !== "" ? parseFloat(per_head_rate) : null,
        per_head_min: per_head_min !== undefined && per_head_min !== null && per_head_min !== "" ? parseInt(per_head_min) : null,
        per_head_max: per_head_max !== undefined && per_head_max !== null && per_head_max !== "" ? parseInt(per_head_max) : null,
        fixed_fee: fixed_fee !== undefined && fixed_fee !== null && fixed_fee !== "" ? parseFloat(fixed_fee) : null,
        minimum_guests: minimum_guests !== undefined && minimum_guests !== null && minimum_guests !== "" ? parseInt(minimum_guests) : null,
        below_minimum_percent: below_minimum_percent !== undefined && below_minimum_percent !== null && below_minimum_percent !== "" ? parseFloat(below_minimum_percent) : null,
        bonus_threshold: bonus_threshold !== undefined && bonus_threshold !== null && bonus_threshold !== "" ? parseInt(bonus_threshold) : null,
        bonus_amount: bonus_amount !== undefined && bonus_amount !== null && bonus_amount !== "" ? parseFloat(bonus_amount) : null,
        bonus_tiers: bonus_tiers && Array.isArray(bonus_tiers) && bonus_tiers.length > 0 ? bonus_tiers : null,
        is_default: is_default === true,
        table_commission_type: table_commission_type || null,
        table_commission_rate: table_commission_rate !== undefined && table_commission_rate !== null && table_commission_rate !== "" ? parseFloat(table_commission_rate) : null,
        table_commission_flat_fee: table_commission_flat_fee !== undefined && table_commission_flat_fee !== null && table_commission_flat_fee !== "" ? parseFloat(table_commission_flat_fee) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating payout template:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("Failed to create payout template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}
