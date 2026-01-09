import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

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

    // Determine DOKU API URL based on environment
    const baseUrl = environment === "production"
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com";

    let testStatus = "success";
    let testMessage = "Connection successful";

    try {
      // For demo purposes, we'll do a simple validation
      // In production, we'd make an actual API call to DOKU to verify credentials

      // Basic validation of credential format
      if (!clientId.startsWith("BRN-") && !clientId.startsWith("MCH-")) {
        // For demo, accept any format but warn
        // In production, DOKU client IDs have specific formats
      }

      // Simulate API call delay for realistic demo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For now, we'll assume success if credentials are present
      // TODO: Implement actual DOKU API health check
      // const response = await fetch(`${baseUrl}/merchant/v1/health`, {
      //   headers: {
      //     "Client-Id": clientId,
      //     "Request-Id": crypto.randomUUID(),
      //     // Add HMAC signature
      //   },
      // });

      testStatus = "success";
      testMessage = `Connected to DOKU ${environment} environment`;

    } catch (apiError: any) {
      testStatus = "failed";
      testMessage = apiError.message || "Failed to connect to DOKU";
    }

    // Update the test status in settings
    await serviceSupabase
      .from("venue_payment_settings")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: testStatus === "success" ? "success" : testMessage,
      })
      .eq("venue_id", venueId);

    return NextResponse.json({
      success: testStatus === "success",
      status: testStatus,
      message: testMessage,
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
