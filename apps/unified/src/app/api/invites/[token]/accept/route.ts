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
    // In local dev, use same origin (3006). In production, use app subdomain
    const isLocalDev = request.headers.get("host")?.includes("localhost");
    const origin = request.headers.get("origin") || request.url.split("/").slice(0, 3).join("/");
    // All routes are now on the same origin
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

