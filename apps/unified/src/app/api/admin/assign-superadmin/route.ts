import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * API route to assign superadmin role
 * SECURITY: This endpoint is disabled in production.
 * Only works in development with explicit environment variable enabled.
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // CRITICAL SECURITY: Block this endpoint entirely in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    );
  }

  // Additional security: Require explicit opt-in via environment variable
  if (process.env.ALLOW_SUPERADMIN_ASSIGNMENT !== "true") {
    return NextResponse.json(
      { error: "Superadmin assignment is disabled. Set ALLOW_SUPERADMIN_ASSIGNMENT=true to enable." },
      { status: 403 }
    );
  }

  try {
    // Require authentication - only existing superadmins can create new ones
    const userClient = await createClient();
    const { data: { user: currentUser } } = await userClient.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if current user is already a superadmin
    const supabase = createServiceRoleClient();
    const { data: existingRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "superadmin")
      .single();

    // If no superadmins exist yet, allow first assignment (bootstrap case)
    const { count: superadminCount } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "superadmin");

    const isBootstrap = superadminCount === 0;
    const isCurrentlySuperadmin = !!existingRoles;

    if (!isBootstrap && !isCurrentlySuperadmin) {
      return NextResponse.json(
        { error: "Only existing superadmins can assign this role" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 }
      );
    }

    const targetUser = users.users.find(u => u.email === email);

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found. Please ensure they have signed up first." },
        { status: 404 }
      );
    }

    // Assign superadmin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: targetUser.id,
        role: "superadmin",
        metadata: {
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          is_bootstrap: isBootstrap,
        },
      }, {
        onConflict: "user_id,role",
      });

    if (roleError) {
      return NextResponse.json(
        { error: "Failed to assign role" },
        { status: 500 }
      );
    }

    console.log(`[Security] Superadmin role assigned to ${email} by ${currentUser.email} (bootstrap: ${isBootstrap})`);

    return NextResponse.json({
      success: true,
      message: `Superadmin role assigned to ${email}`,
      user_id: targetUser.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign superadmin role";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

