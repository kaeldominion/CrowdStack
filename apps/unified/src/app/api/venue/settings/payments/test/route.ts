import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { DokuService } from "@/lib/services/doku";

export const dynamic = "force-dynamic";

/**
 * POST /api/venue/settings/payments/test
 * Test DOKU connection with provided or saved credentials
 */
export async function POST(request: NextRequest) {
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

    console.log("[Payment Test] Testing DOKU for venue:", venueId);

    const body = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get current settings to retrieve credentials
    const { data: settings } = await serviceSupabase
      .from("venue_payment_settings")
      .select("doku_client_id, doku_secret_key, doku_environment")
      .eq("venue_id", venueId)
      .single();

    // Use provided credentials or fall back to saved ones
    const clientId = body.doku_client_id || settings?.doku_client_id;
    const secretKey = (body.doku_secret_key && !body.doku_secret_key.includes("•"))
      ? body.doku_secret_key
      : settings?.doku_secret_key;
    const environment = body.doku_environment || settings?.doku_environment || "sandbox";

    if (!clientId || !secretKey) {
      return NextResponse.json(
        { error: "DOKU credentials not configured" },
        { status: 400 }
      );
    }

    // Create DOKU service and test connection
    const dokuService = new DokuService({
      clientId,
      secretKey,
      environment: environment as "sandbox" | "production",
    });

    const testResult = await dokuService.testConnection();

    // Update the test status in settings
    await serviceSupabase
      .from("venue_payment_settings")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: testResult.success ? "success" : testResult.error,
      })
      .eq("venue_id", venueId);

    return NextResponse.json({
      success: testResult.success,
      status: testResult.success ? "success" : "failed",
      message: testResult.success ? testResult.message : testResult.error,
      environment,
      tested_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error testing DOKU connection:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test connection" },
      { status: 500 }
    );
  }
}
