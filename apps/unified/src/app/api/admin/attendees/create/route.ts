import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Validate input
    if (!body.phone && !body.email) {
      return NextResponse.json(
        { error: "Either phone or email is required" },
        { status: 400 }
      );
    }

    // SECURITY FIX: Use separate parameterized queries instead of string interpolation
    // to prevent filter injection attacks
    let existing = null;

    // Check by phone if provided
    if (body.phone) {
      const { data: byPhone } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("phone", body.phone)
        .limit(1)
        .maybeSingle();

      if (byPhone) {
        existing = byPhone;
      }
    }

    // Check by email if provided and no phone match
    if (!existing && body.email) {
      const { data: byEmail } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("email", body.email)
        .limit(1)
        .maybeSingle();

      if (byEmail) {
        existing = byEmail;
      }
    }

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

