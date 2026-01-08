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

    const { data: venue, error } = await serviceSupabase
      .from("venues")
      .insert({
        name: body.name,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        country: body.country || "US",
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ venue });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create venue" },
      { status: 500 }
    );
  }
}

