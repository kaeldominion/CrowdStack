import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export async function PATCH(
  request: Request,
  { params }: { params: { organizerId: string } }
) {
  try {
    const { organizerId } = params;

    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, website, description } = body;

    const serviceSupabase = createServiceRoleClient();

    const { data: organizer, error } = await serviceSupabase
      .from("organizers")
      .update({
        name,
        email: email || null,
        phone: phone || null,
        website: website || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizerId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update organizer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organizer });
  } catch (error: any) {
    console.error("Error updating organizer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update organizer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { organizerId: string } }
) {
  try {
    const { organizerId } = params;

    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if organizer has events
    const { count: eventsCount } = await serviceSupabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", organizerId);

    if (eventsCount && eventsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete organizer with existing events" },
        { status: 400 }
      );
    }

    // Delete organizer
    const { error } = await serviceSupabase
      .from("organizers")
      .delete()
      .eq("id", organizerId);

    if (error) {
      console.error("Failed to delete organizer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting organizer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete organizer" },
      { status: 500 }
    );
  }
}

