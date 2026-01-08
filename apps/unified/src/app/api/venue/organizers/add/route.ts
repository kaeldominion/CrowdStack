import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

// POST - Add an organizer to work with the venue (by searching for user email)

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // First, try to find organizer by email in organizers table
    const { data: organizerByEmail } = await serviceSupabase
      .from("organizers")
      .select("id, name, email, created_by")
      .eq("email", email)
      .maybeSingle();

    if (organizerByEmail) {
      // Found organizer by email, check if they've worked together
      const { data: existingEvent } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("venue_id", venueId)
        .eq("organizer_id", organizerByEmail.id)
        .maybeSingle();

      if (existingEvent) {
        return NextResponse.json({
          success: true,
          organizer: organizerByEmail,
          message: "Organizer already has events at this venue. They can continue creating events.",
        });
      }

      return NextResponse.json({
        success: true,
        organizer: organizerByEmail,
        message: "Organizer found. They can now create events at your venue.",
      });
    }

    // If not found by organizer email, try to find by user email
    // List users and find by email
    const { data: { users }, error: listError } = await serviceSupabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      return NextResponse.json(
        { error: "Failed to search for user" },
        { status: 500 }
      );
    }

    const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: `No user found with email "${email}". Please verify the email address.` },
        { status: 404 }
      );
    }

    // Find organizer linked to this user (via created_by or organizer_users)
    const { data: organizerByCreatedBy } = await serviceSupabase
      .from("organizers")
      .select("id, name, email, created_by")
      .eq("created_by", user.id)
      .maybeSingle();

    // Also check organizer_users table
    const { data: organizerUser } = await serviceSupabase
      .from("organizer_users")
      .select("organizer_id, organizer:organizers(id, name, email)")
      .eq("user_id", user.id)
      .maybeSingle();

    let organizer;
    if (organizerByCreatedBy) {
      organizer = organizerByCreatedBy;
    } else if (organizerUser) {
      organizer = Array.isArray(organizerUser.organizer)
        ? organizerUser.organizer[0]
        : organizerUser.organizer;
    }

    if (!organizer) {
      return NextResponse.json(
        { error: "This user does not have an organizer account. They need to create an organizer profile first." },
        { status: 404 }
      );
    }

    // Check if they've already worked together (have events at this venue)
    const { data: existingEvent } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId)
      .eq("organizer_id", organizer.id)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        organizer,
        message: "Organizer already has events at this venue. They can continue creating events.",
      });
    }

    // They haven't worked together yet, but the organizer is now "added" 
    // (they can create events at this venue)
    return NextResponse.json({
      success: true,
      organizer,
      message: "Organizer found. They can now create events at your venue.",
    });
  } catch (error: any) {
    console.error("Error adding organizer:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to add organizer" },
      { status: 500 }
    );
  }
}
