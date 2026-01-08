import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/venue/qr-codes
 * List QR codes for the current venue(s)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
 * Generate a unique code for QR code
 */
function generateQRCode(prefix: string = "ven"): string {
  const timestamp = Date.now().toString(36).slice(-6);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${timestamp}-${random}`.toLowerCase();
}

/**
 * Check if a code already exists
 */
async function codeExists(code: string): Promise<boolean> {
  const serviceSupabase = createServiceRoleClient();
  const { data, error } = await serviceSupabase
    .from("dynamic_qr_codes")
    .select("code")
    .eq("code", code)
    .single();
  
  return !!data && !error;
}

/**
 * Generate a unique code with conflict checking
 */
async function generateUniqueCode(prefix: string = "ven", maxAttempts: number = 10): Promise<string> {
  let attempts = 0;
  let code = generateQRCode(prefix);
  
  while (attempts < maxAttempts) {
    const exists = await codeExists(code);
    if (!exists) {
      return code;
    }
    code = generateQRCode(prefix);
    attempts++;
  }
  
  // If we still have conflicts after max attempts, add more randomness
  const fallback = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toLowerCase();
  return fallback;
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
    const { name, description, target_url, venue_id } = body;

    if (!name || !target_url) {
      return NextResponse.json(
        { error: "Missing required fields: name, target_url" },
        { status: 400 }
      );
    }

    // Use provided venue_id if it's one the user has access to, otherwise use first
    const selectedVenueId = venue_id && venueIds.includes(venue_id)
      ? venue_id
      : venueIds[0];

    // Validate URL
    try {
      new URL(target_url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Auto-generate unique code
    const code = await generateUniqueCode("ven");

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .insert({
        code,
        name,
        description: description || null,
        target_url,
        venue_id: selectedVenueId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // This shouldn't happen with our conflict checking, but handle it anyway
        return NextResponse.json(
          { error: "Code conflict detected. Please try again." },
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

