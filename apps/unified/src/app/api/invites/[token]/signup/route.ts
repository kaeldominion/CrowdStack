import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getInviteToken, acceptInviteToken } from "@crowdstack/shared/auth/invites";

/**
 * POST /api/invites/[token]/signup
 * Sign up with email/password for an invite token
 * This bypasses magic link rate limits for invite-only signups
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
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

    // Validate invite token exists and is valid
    const inviteToken = await getInviteToken(params.token);
    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 400 }
      );
    }

    if (inviteToken.used_at) {
      return NextResponse.json(
        { error: "Invite token has already been used" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists - try to sign them in with password
      // Note: We can't verify password from service role, so we need to return
      // a message telling them to log in instead
      return NextResponse.json(
        { 
          error: "An account with this email already exists. Please log in instead.",
          existingAccount: true 
        },
        { status: 400 }
      );
    }

    // Create new user with password
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for invite signups
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

    userId = newUser.user.id;

    // Accept the invite token (assigns role and links to entity)
    const { role, metadata } = await acceptInviteToken(params.token, userId);

    // Determine redirect URL based on role
    const appUrl = request.nextUrl.origin;
    let redirectUrl = "/me";

    switch (role) {
      case "venue_admin":
        redirectUrl = `${appUrl}/app/venue`;
        break;
      case "event_organizer":
        redirectUrl = `${appUrl}/app/organizer`;
        break;
      case "promoter":
        redirectUrl = `${appUrl}/app/promoter`;
        break;
      case "door_staff":
        redirectUrl = `${appUrl}/door`;
        break;
      default:
        redirectUrl = "/me";
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
      role,
      redirect_url: redirectUrl,
      // Client will sign in with password after account creation
    });
  } catch (error: any) {
    console.error("Failed to sign up with invite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign up" },
      { status: 500 }
    );
  }
}

