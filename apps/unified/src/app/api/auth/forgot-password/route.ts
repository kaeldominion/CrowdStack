import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/auth/forgot-password
 * Send password reset email to user
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get the origin to construct the reset URL
    const origin = request.nextUrl.origin;
    const redirectTo = `${origin}/auth/reset-password`;

    console.log("[Forgot Password] Sending reset email to:", email);
    console.log("[Forgot Password] Redirect URL:", redirectTo);
    
    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    console.log("[Forgot Password] Supabase response:", { data, error: error?.message });

    if (error) {
      console.error("[Forgot Password] Error:", error.message, error.status);
      
      // Rate limit errors should be shown to the user (doesn't reveal email existence)
      if (error.message?.toLowerCase().includes("rate limit") || error.status === 429) {
        return NextResponse.json(
          { error: "Too many password reset requests. Please wait a few minutes before trying again." },
          { status: 429 }
        );
      }
      
      // For other errors, still return success to prevent email enumeration attacks
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }
    
    console.log("[Forgot Password] Email sent successfully (according to Supabase)");

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("[Forgot Password] Unexpected error:", error);
    // Still return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  }
}

