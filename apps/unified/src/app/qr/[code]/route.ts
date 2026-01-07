import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /qr/[code]
 * Redirect dynamic QR code to its current target URL
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
      .select("target_url")
      .eq("code", code)
      .single();

    if (error || !qrCode) {
      console.error("[QR Redirect] QR code not found:", code, error);
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Redirect to the target URL
    return NextResponse.redirect(new URL(qrCode.target_url, request.url));
  } catch (error: any) {
    console.error("[QR Redirect] Unexpected error:", error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  }
}

