import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("superadmin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, website, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: organizer, error } = await serviceSupabase
      .from("organizers")
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        website: website || null,
        description: description || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create organizer:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organizer });
  } catch (error: any) {
    console.error("Error creating organizer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create organizer" },
      { status: 500 }
    );
  }
}

