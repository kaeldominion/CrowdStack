import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "crowdstack_impersonation";
const IMPERSONATION_LOG_TABLE = "impersonation_logs";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = roles?.some((r: { role: string }) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden - superadmin only" }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Get the target user's email
    const admin = createServiceRoleClient();
    const { data: targetUserData, error: targetError } = await admin.auth.admin.getUserById(userId);

    if (targetError || !targetUserData?.user) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Log the impersonation
    try {
      await supabase.from(IMPERSONATION_LOG_TABLE).insert({
        admin_user_id: user.id,
        target_user_id: userId,
        target_email: targetUserData.user.email,
        action: "start",
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch {
      // Table might not exist, that's okay
    }

    // Set impersonation cookie
    const cookieStore = await cookies();
    const impersonationData = {
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      targetEmail: targetUserData.user.email,
      startedAt: new Date().toISOString(),
    };

    cookieStore.set(IMPERSONATION_COOKIE, JSON.stringify(impersonationData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 hours max
      path: "/",
    });

    return NextResponse.json({ 
      success: true,
      message: `Now viewing as ${targetUserData.user.email}`,
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (impersonationCookie) {
      try {
        const impersonationData = JSON.parse(impersonationCookie.value);
        
        // Log the end of impersonation (errors are okay, table might not exist)
        await supabase.from(IMPERSONATION_LOG_TABLE).insert({
          admin_user_id: impersonationData.adminUserId,
          target_user_id: impersonationData.targetUserId,
          target_email: impersonationData.targetEmail,
          action: "end",
          ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          user_agent: request.headers.get("user-agent"),
        });
      } catch {
        // Invalid cookie data, just clear it
      }
    }

    // Clear the impersonation cookie
    cookieStore.delete(IMPERSONATION_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("End impersonation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (!impersonationCookie) {
      return NextResponse.json({ impersonating: false });
    }

    try {
      const impersonationData = JSON.parse(impersonationCookie.value);
      return NextResponse.json({
        impersonating: true,
        ...impersonationData,
      });
    } catch {
      return NextResponse.json({ impersonating: false });
    }
  } catch (error) {
    console.error("Get impersonation status error:", error);
    return NextResponse.json({ impersonating: false });
  }
}

