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

    // Try to create new user with password (auto-confirm email to bypass rate limits)
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to bypass rate limits
    });

    if (createError) {
      console.error("[Password Signup] Create error:", createError.message);
      
      // Check if user already exists
      if (createError.message?.toLowerCase().includes("already") || 
          createError.message?.toLowerCase().includes("duplicate") ||
          createError.message?.toLowerCase().includes("exists")) {
        
        // User exists - try to find and update their password
        // Use a more efficient approach: query auth.users view through RPC or just try to update
        try {
          // First, get the user ID by querying the identities table (which has email index)
          const { data: identities, error: identityError } = await serviceSupabase
            .from("auth.identities")
            .select("user_id")
            .eq("provider", "email")
            .ilike("email", email)
            .limit(1);

          if (identityError) {
            console.log("[Password Signup] Could not query identities:", identityError.message);
          }

          if (identities && identities.length > 0) {
            const userId = identities[0].user_id;
            
            // Try to update the password
            const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
              userId,
              { password }
            );

            return NextResponse.json({
              success: true,
              userExists: true,
              passwordUpdated: !updateError,
              message: updateError 
                ? "User account exists. Please sign in with your existing password."
                : "Password updated. You can now sign in.",
            });
          }
        } catch (lookupErr) {
          console.log("[Password Signup] Lookup failed, returning generic response");
        }

        // Fallback: just tell client user exists (they can try to sign in)
        return NextResponse.json({
          success: true,
          userExists: true,
          message: "An account with this email already exists. Please sign in with your password.",
        });
      }

      // Other create errors
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

    console.log("[Password Signup] User created successfully:", newUser.user.id);

    // Return user info (client will sign in with password after a brief delay)
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
    console.error("[Password Signup] Exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
