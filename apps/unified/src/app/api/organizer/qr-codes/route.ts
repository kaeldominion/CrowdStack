import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerIds } from "@/lib/data/get-user-entity";

/**
 * GET /api/organizer/qr-codes
 * List QR codes for the current organizer
 */
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ 
        error: "Forbidden - Organizer role required"
      }, { status: 403 });
    }

    const organizerIds = await getUserOrganizerIds();
    if (organizerIds.length === 0) {
      return NextResponse.json({ qrCodes: [] });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCodes, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("*")
      .in("organizer_id", organizerIds)
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
function generateQRCode(prefix: string = "org"): string {
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
async function generateUniqueCode(prefix: string = "org", maxAttempts: number = 10): Promise<string> {
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
 * POST /api/organizer/qr-codes
 * Create a new QR code for the current organizer
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ 
        error: "Forbidden - Organizer role required"
      }, { status: 403 });
    }

    const organizerIds = await getUserOrganizerIds();
    if (organizerIds.length === 0) {
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, target_url, organizer_id } = body;

    if (!name || !target_url) {
      return NextResponse.json(
        { error: "Missing required fields: name, target_url" },
        { status: 400 }
      );
    }

    // Use provided organizer_id if it's one the user has access to, otherwise use first
    const selectedOrganizerId = organizer_id && organizerIds.includes(organizer_id)
      ? organizer_id
      : organizerIds[0];

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
    const code = await generateUniqueCode("org");

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .insert({
        code,
        name,
        description: description || null,
        target_url,
        organizer_id: selectedOrganizerId,
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

