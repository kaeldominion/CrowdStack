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
    const { code, name, target_url } = body;

    if (!code || !name || !target_url) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, target_url" },
        { status: 400 }
      );
    }

    // Validate code format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only alphanumeric characters, hyphens, and underscores" },
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

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .insert({
        code,
        name,
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

