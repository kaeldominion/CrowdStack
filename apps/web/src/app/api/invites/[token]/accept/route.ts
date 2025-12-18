import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { acceptInviteToken } from "@crowdstack/shared/auth/invites";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { role, metadata } = await acceptInviteToken(params.token, user.id);

    // Determine redirect URL based on role
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
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
      role,
      redirect_url: redirectUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to accept invite" },
      { status: 400 }
    );
  }
}

