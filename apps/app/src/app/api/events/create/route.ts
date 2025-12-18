import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
import type { CreateEventRequest } from "@crowdstack/shared";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role
    if (!(await userHasRole("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CreateEventRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get organizer ID
    const { data: organizer } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
      .single();

    if (!organizer) {
      return NextResponse.json(
        { error: "Organizer profile not found" },
        { status: 400 }
      );
    }

    // Create event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description || null,
        venue_id: body.venue_id || null,
        organizer_id: organizer.id,
        start_time: body.start_time,
        end_time: body.end_time || null,
        capacity: body.capacity || null,
        cover_image_url: body.cover_image_url || null,
        status: "draft",
      })
      .select()
      .single();

    if (eventError) {
      throw eventError;
    }

    // Create event_promoters if provided
    if (body.promoters && body.promoters.length > 0) {
      const eventPromoters = body.promoters.map((p) => ({
        event_id: event.id,
        promoter_id: p.promoter_id,
        commission_type: p.commission_type,
        commission_config: p.commission_config,
      }));

      await serviceSupabase.from("event_promoters").insert(eventPromoters);
    }

    // Emit outbox event
    const { emitOutboxEvent } = await import("@crowdstack/shared");
    await emitOutboxEvent("event_created", {
      event_id: event.id,
      organizer_id: organizer.id,
    });

    return NextResponse.json({ event });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    );
  }
}

