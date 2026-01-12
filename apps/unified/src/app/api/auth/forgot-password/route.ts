import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { logEmail } from "@crowdstack/shared/email/log-email";

/**
 * POST /api/auth/forgot-password
 * Send password reset email to user
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
    // For local development, prefer the request origin
    // For production, use environment variable if available
    const requestOrigin = request.nextUrl.origin;
    const envOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_WEB_URL;
    
    // Use request origin (works for localhost), fall back to env variable
    const origin = requestOrigin || envOrigin || 'https://beta.crowdstack.app';
    const redirectTo = `${origin}/auth/reset-password`;

    if (process.env.NODE_ENV === "development") {
      console.log("[Forgot Password] Sending reset email to:", email);
      console.log("[Forgot Password] Request origin:", requestOrigin);
      console.log("[Forgot Password] Env origin:", envOrigin);
      console.log("[Forgot Password] Final redirect URL:", redirectTo);
    }
    
    // Get recipient user ID if available (for logging)
    const { data: user } = await supabase
      .from("attendees")
      .select("id")
      .eq("email", email)
      .single();
    const recipientUserId = user?.id || null;

    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[Forgot Password] Supabase response:", { data, error: error?.message });
    }

    if (error) {
      console.error("[Forgot Password] Error:", error.message, error.status);
      
      // Log failed password reset attempt
      await logEmail({
        recipient: email,
        recipientUserId,
        subject: "Password Reset - CrowdStack",
        emailType: "system",
        templateSlug: "password_reset",
        status: "failed",
        errorMessage: error.message,
        metadata: {
          redirect_to: redirectTo,
          sent_via: "supabase_auth",
          source: "forgot_password",
        },
      });
      
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
    
    if (process.env.NODE_ENV === "development") {
      console.log("[Forgot Password] Email sent successfully (according to Supabase)");
    }

    // Log successful password reset email
    // Note: Supabase Auth sends the email, so we don't have a Postmark message ID
    await logEmail({
      recipient: email,
      recipientUserId,
      subject: "Password Reset - CrowdStack",
      emailType: "system",
      templateSlug: "password_reset",
      status: "sent",
      sentAt: new Date().toISOString(),
      metadata: {
        redirect_to: redirectTo,
        sent_via: "supabase_auth",
        source: "forgot_password",
      },
    });

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

