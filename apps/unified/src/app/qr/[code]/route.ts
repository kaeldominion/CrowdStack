import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /qr/[code]
 * Redirect dynamic QR code to its current target URL
 * Tracks the scan for analytics
 * Public endpoint - no authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code;

    if (!code) {
      return NextResponse.json(
        { error: "QR code not found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("id, target_url")
      .eq("code", code)
      .single();

    if (error || !qrCode) {
      console.error("[QR Redirect] QR code not found:", code, error);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Track the scan (fire and forget - don't block redirect)
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referer = request.headers.get("referer") || null;

    // Don't await - let it run in background
    (async () => {
      try {
        await serviceSupabase
          .from("qr_code_scans")
          .insert({
            qr_code_id: qrCode.id,
            ip_address: ipAddress.split(",")[0].trim(), // Get first IP if comma-separated
            user_agent: userAgent,
            referer: referer,
          });
      } catch (err) {
        // Silently fail - don't block redirect if tracking fails
        console.error("[QR Redirect] Failed to track scan:", err);
      }
    })();

    // Redirect to the target URL
    return NextResponse.redirect(new URL(qrCode.target_url, request.url));
  } catch (error: any) {
    console.error("[QR Redirect] Unexpected error:", error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  }
}

