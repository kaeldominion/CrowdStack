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
 * PATCH /api/admin/qr-codes/[id]
 * Update a dynamic QR code (typically just the target_url)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (description !== undefined) {
      updateData.description = description || null;
    }
    
    if (target_url !== undefined) {
      // Validate URL
      try {
        new URL(target_url);
        updateData.target_url = target_url;
      } catch {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: qrCode, error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") { // Not found
        return NextResponse.json(
          { error: "QR code not found" },
          { status: 404 }
        );
      }
      console.error("[QR Codes API] Error updating QR code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ qrCode });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/qr-codes/[id]
 * Delete a dynamic QR code
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { error } = await serviceSupabase
      .from("dynamic_qr_codes")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("[QR Codes API] Error deleting QR code:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[QR Codes API] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

