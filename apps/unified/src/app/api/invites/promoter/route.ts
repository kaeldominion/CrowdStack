import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createInviteToken } from "@crowdstack/shared/auth/invites";
import { getUserRoles } from "@crowdstack/shared/auth/roles";
import { getUserOrganizerId, getUserVenueId } from "@/lib/data/get-user-entity";

/**
 * POST /api/invites/promoter
 * 
 * Allows organizers and venues to create promoter invite tokens
 * No admin approval needed - auto-approved
 * 
 * Request body:
 * {
 *   email?: string,  // Optional - for tracking who was invited
 *   event_id?: string // Optional - to pre-assign to an event
 * }
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
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

    const roles = await getUserRoles();
    const isOrganizer = roles.includes("event_organizer");
    const isVenueAdmin = roles.includes("venue_admin");
    const isSuperadmin = roles.includes("superadmin");

    // Only organizers, venue admins, or superadmins can invite promoters
    if (!isOrganizer && !isVenueAdmin && !isSuperadmin) {
      return NextResponse.json(
        { error: "Only organizers, venue admins, or superadmins can invite promoters" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, event_id } = body;

    // Get the organizer_id or venue_id for the user
    let organizerId: string | null = null;
    let venueId: string | null = null;

    if (isOrganizer) {
      organizerId = await getUserOrganizerId();
      if (!organizerId) {
        return NextResponse.json(
          { error: "Organizer profile not found" },
          { status: 404 }
        );
      }
    }

    if (isVenueAdmin) {
      venueId = await getUserVenueId();
      if (!venueId) {
        return NextResponse.json(
          { error: "Venue profile not found" },
          { status: 404 }
        );
      }
    }

    // If event_id is provided, verify the user has access to that event
    if (event_id) {
      const { data: event } = await supabase
        .from("events")
        .select("id, organizer_id, venue_id")
        .eq("id", event_id)
        .single();

      if (!event) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      // Verify access
      if (isOrganizer && event.organizer_id !== organizerId) {
        return NextResponse.json(
          { error: "You don't have access to this event" },
          { status: 403 }
        );
      }

      if (isVenueAdmin && event.venue_id !== venueId) {
        return NextResponse.json(
          { error: "You don't have access to this event" },
          { status: 403 }
        );
      }
    }

    // Create invite token with promoter role
    const metadata: Record<string, any> = {
      invited_by: user.id,
      invited_by_email: user.email,
      auto_approved: true,
    };

    if (organizerId) {
      metadata.invited_by_organizer_id = organizerId;
    }

    if (venueId) {
      metadata.invited_by_venue_id = venueId;
    }

    if (event_id) {
      metadata.pre_assign_event_id = event_id;
    }

    if (email) {
      metadata.invitee_email = email;
    }

    const token = await createInviteToken("promoter", metadata, user.id);

    // Build invite URL
    const origin = request.nextUrl.origin;
    const inviteUrl = `${origin}/invite/${token}`;

    return NextResponse.json({
      success: true,
      token,
      invite_url: inviteUrl,
      metadata,
    });
  } catch (error: any) {
    console.error("Failed to create promoter invite:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create promoter invite" },
      { status: 500 }
    );
  }
}

