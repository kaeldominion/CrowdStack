import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * GET /api/venue/settings/payments
 * Get venue payment settings
 */
export async function GET(request: NextRequest) {
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

    const serviceSupabase = createServiceRoleClient();

    console.log("[Payment Settings GET] Venue ID:", venueId);

    // Get payment settings
    const { data: settings, error } = await serviceSupabase
      .from("venue_payment_settings")
      .select("*")
      .eq("venue_id", venueId)
      .single();

    console.log("[Payment Settings GET] Query result:", {
      hasData: !!settings,
      error: error?.message,
      errorCode: error?.code,
      dokuEnabled: settings?.doku_enabled,
      hasClientId: !!settings?.doku_client_id,
    });

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      console.error("Error fetching payment settings:", error);
      return NextResponse.json({ error: "Failed to fetch payment settings" }, { status: 500 });
    }

    // Return settings (mask secret key for security)
    const maskedSettings = settings
      ? {
          ...settings,
          doku_secret_key: settings.doku_secret_key ? "••••••••••••••••" : null,
          has_secret_key: !!settings.doku_secret_key,
        }
      : null;

    return NextResponse.json({
      settings: maskedSettings,
    });
  } catch (error: any) {
    console.error("Error in payment settings GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

interface UpdatePaymentSettingsRequest {
  doku_enabled?: boolean;
  doku_client_id?: string;
  doku_secret_key?: string;
  doku_environment?: "sandbox" | "production";
  manual_payment_enabled?: boolean;
  manual_payment_instructions?: string;
  auto_confirm_on_payment?: boolean;
  payment_expiry_hours?: number;
}

/**
 * PUT /api/venue/settings/payments
 * Update venue payment settings
 */
export async function PUT(request: NextRequest) {
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

    const body: UpdatePaymentSettingsRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Build update object
    const updateData: Record<string, any> = {
      venue_id: venueId,
      updated_at: new Date().toISOString(),
      configured_by: userId,
    };

    if (body.doku_enabled !== undefined) {
      updateData.doku_enabled = body.doku_enabled;
    }

    if (body.doku_client_id !== undefined) {
      updateData.doku_client_id = body.doku_client_id?.trim();
    }

    // Only update secret key if a new one is provided (not the masked value)
    if (body.doku_secret_key && !body.doku_secret_key.includes("•")) {
      updateData.doku_secret_key = body.doku_secret_key?.trim();
    }

    if (body.doku_environment !== undefined) {
      updateData.doku_environment = body.doku_environment;
    }

    if (body.manual_payment_enabled !== undefined) {
      updateData.manual_payment_enabled = body.manual_payment_enabled;
    }

    if (body.manual_payment_instructions !== undefined) {
      updateData.manual_payment_instructions = body.manual_payment_instructions;
    }

    if (body.auto_confirm_on_payment !== undefined) {
      updateData.auto_confirm_on_payment = body.auto_confirm_on_payment;
    }

    if (body.payment_expiry_hours !== undefined) {
      updateData.payment_expiry_hours = body.payment_expiry_hours;
    }

    // Log what we're about to save
    console.log("[Payment Settings PUT] Venue ID:", venueId);
    console.log("[Payment Settings PUT] Update data:", {
      ...updateData,
      doku_secret_key: updateData.doku_secret_key ? "[REDACTED]" : undefined,
    });

    // Upsert settings
    const { data: settings, error } = await serviceSupabase
      .from("venue_payment_settings")
      .upsert(updateData, { onConflict: "venue_id" })
      .select()
      .single();

    console.log("[Payment Settings PUT] Upsert result:", {
      success: !error,
      hasData: !!settings,
      error: error?.message,
      savedDokuEnabled: settings?.doku_enabled,
    });

    if (error) {
      console.error("Error updating payment settings:", error);
      return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
    }

    if (!settings) {
      console.error("No settings returned from upsert despite no error");
      return NextResponse.json({ error: "Failed to save settings - no data returned" }, { status: 500 });
    }

    // Return masked settings
    const maskedSettings = {
      ...settings,
      doku_secret_key: settings.doku_secret_key ? "••••••••••••••••" : null,
      has_secret_key: !!settings.doku_secret_key,
    };

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
    });
  } catch (error: any) {
    console.error("Error in payment settings PUT:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
