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
    // All routes use the same origin (unified app)
    const isLocalDev = request.headers.get("host")?.includes("localhost");
    const origin = request.headers.get("origin") || request.url.split("/").slice(0, 3).join("/");
    // All routes are now on the same origin
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

