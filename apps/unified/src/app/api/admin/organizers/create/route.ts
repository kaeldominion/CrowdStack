import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
    const { name, email, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company Name / Organizer Name is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Use the name field for both name and company_name (since name comes from assigned user later)
    const { data: organizer, error } = await serviceSupabase
      .from("organizers")
      .insert({
        name: name.trim(), // This will be updated when a user is assigned
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company_name: name.trim(), // Store as company_name as well for now
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

