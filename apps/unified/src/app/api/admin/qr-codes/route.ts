import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * Helper to get authenticated user ID
 */
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.id) {
    return user.id;
  }

  // Try reading from localhost cookie for dev
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
  const authCookieName = `sb-${projectRef}-auth-token`;
  const authCookie = cookieStore.get(authCookieName);

  if (authCookie) {
    try {
      const cookieValue = decodeURIComponent(authCookie.value);
      const parsed = JSON.parse(cookieValue);
      if (parsed.user?.id) {
        return parsed.user.id;
      }
    } catch (e) {
      // Cookie parse error
    }
  }

  return null;
}

/**
 * Check if user is superadmin
 */
async function isSuperadmin(userId: string): Promise<boolean> {
  const serviceSupabase = createServiceRoleClient();
  const { data: userRoles } = await serviceSupabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  
  const roles = userRoles?.map((r) => r.role) || [];
  return roles.includes("superadmin");
}

/**
 * Generate a unique code for QR code
 */
function generateQRCode(prefix: string = "admin"): string {
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
async function generateUniqueCode(prefix: string = "admin", maxAttempts: number = 10): Promise<string> {
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
 * GET /api/admin/qr-codes
 * List all dynamic QR codes
 */
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required"
      }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCodes, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[QR Codes API] Error fetching QR codes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ qrCodes });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/qr-codes
 * Create a new dynamic QR code
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperadmin(userId))) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required"
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, target_url } = body;

    if (!name || !target_url) {
      return NextResponse.json(
        { error: "Missing required fields: name, target_url" },
        { status: 400 }
      );
    }

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
    const code = await generateUniqueCode("admin");

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .insert({
        code,
        name,
        description: description || null,
        target_url,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json(
          { error: "A QR code with this code already exists" },
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

