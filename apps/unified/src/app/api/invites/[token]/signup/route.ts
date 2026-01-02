import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getInviteToken, acceptInviteToken } from "@crowdstack/shared/auth/invites";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

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

    // Send welcome email and role-specific email
    try {
      const userName = newUser.user.email?.split("@")[0] || "there";
      const appUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app";

      // Send general welcome email
      await sendTemplateEmail(
        "welcome",
        newUser.user.email!,
        userId,
        {
          user_name: userName,
          app_url: `${appUrl}/app`,
        }
      );

      // Send role-specific welcome email
      if (role === "venue_admin" && metadata?.venue_id) {
        const { data: venue } = await serviceSupabase
          .from("venues")
          .select("name")
          .eq("id", metadata.venue_id)
          .single();

        if (venue) {
          await sendTemplateEmail(
            "venue_admin_welcome",
            newUser.user.email!,
            userId,
            {
              user_name: userName,
              venue_name: venue.name,
              venue_dashboard_url: `${appUrl}/app/venue`,
            }
          );
        }
      } else if (role === "event_organizer" && metadata?.organizer_id) {
        const { data: organizer } = await serviceSupabase
          .from("organizers")
          .select("name")
          .eq("id", metadata.organizer_id)
          .single();

        if (organizer) {
          await sendTemplateEmail(
            "event_organizer_welcome",
            newUser.user.email!,
            userId,
            {
              user_name: userName,
              organizer_name: organizer.name,
              organizer_dashboard_url: `${appUrl}/app/organizer`,
            }
          );
        }
      } else if (role === "promoter" && metadata?.promoter_id) {
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("name")
          .eq("id", metadata.promoter_id)
          .single();

        if (promoter) {
          await sendTemplateEmail(
            "promoter_welcome",
            newUser.user.email!,
            userId,
            {
              user_name: userName,
              promoter_name: promoter.name,
              promoter_dashboard_url: `${appUrl}/app/promoter`,
            }
          );
        }
      }
    } catch (emailError) {
      console.error("[Invite Signup] Failed to send welcome emails:", emailError);
      // Don't fail the signup if email fails
    }

    // Determine redirect URL based on role
    const appUrl = request.nextUrl.origin;
    let redirectUrl = "/me";

    switch (role) {
      case "venue_admin":
      case "event_organizer":
      case "promoter":
        // All B2B roles go to unified workspace
        redirectUrl = `${appUrl}/app`;
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

