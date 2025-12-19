import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * API route to assign superadmin role to the current user
 * This is a temporary helper for development
 * DELETE THIS IN PRODUCTION
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || "spencertarring@gmail.com";

    // Get user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      return NextResponse.json(
        { error: `Failed to list users: ${userError.message}` },
        { status: 500 }
      );
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found. Please sign up first.` },
        { status: 404 }
      );
    }

    // Assign superadmin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({
        user_id: user.id,
        role: "superadmin",
        metadata: { created_by: "api", created_at: new Date().toISOString() },
      }, {
        onConflict: "user_id,role",
      });

    if (roleError) {
      return NextResponse.json(
        { error: `Failed to assign role: ${roleError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Superadmin role assigned to ${email}`,
      user_id: user.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to assign superadmin role" },
      { status: 500 }
    );
  }
}

