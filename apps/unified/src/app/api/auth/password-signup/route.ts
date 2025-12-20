import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/auth/password-signup
 * Create user account with password using service role (bypasses email confirmation and rate limits)
 * Used as fallback when magic link hits rate limits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // User exists - return success so client can try to sign in
      return NextResponse.json({
        success: true,
        userExists: true,
        message: "User account exists. Please sign in with your password.",
      });
    }

    // Create new user with password (auto-confirm email to bypass rate limits)
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to bypass rate limits
      user_metadata: {
        // Add any metadata if needed
      },
    });

    if (createError) {
      console.error("Failed to create user:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create account" },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Return user info (client will sign in with password after a brief delay)
    // Note: There may be a small delay before the password is available for sign-in
    return NextResponse.json({
      success: true,
      userExists: false,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
      message: "Account created successfully.",
    });
  } catch (error: any) {
    console.error("Failed to create account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

