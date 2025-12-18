import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for superadmin role
    if (!(await userHasRole("superadmin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Check if attendee already exists
    const { data: existing } = await serviceSupabase
      .from("attendees")
      .select("id")
      .or(
        body.phone
          ? `phone.eq.${body.phone}${body.email ? ",email.eq." + body.email : ""}`
          : `email.eq.${body.email}`
      )
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Attendee already exists with this phone or email" },
        { status: 400 }
      );
    }

    const { data: attendee, error } = await serviceSupabase
      .from("attendees")
      .insert({
        name: body.name,
        email: body.email || null,
        phone: body.phone,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ attendee });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create attendee" },
      { status: 500 }
    );
  }
}

