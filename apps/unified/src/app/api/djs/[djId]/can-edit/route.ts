import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

type ManageRole = "admin" | "dj" | null;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ djId: string }> | { djId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { djId } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ canEdit: false, role: null });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");
    if (isSuperadmin) {
      return NextResponse.json({ canEdit: true, role: "admin" as ManageRole });
    }

    // Check if user is the DJ owner
    const { data: dj } = await serviceSupabase
      .from("djs")
      .select("user_id")
      .eq("id", djId)
      .single();

    if (!dj) {
      return NextResponse.json({ canEdit: false, role: null });
    }

    // Check if user is the DJ owner (user_id matches)
    if (dj.user_id && dj.user_id === user.id) {
      return NextResponse.json({ canEdit: true, role: "dj" as ManageRole });
    }

    return NextResponse.json({ canEdit: false, role: null });
  } catch (error) {
    console.error("Error checking DJ edit permission:", error);
    return NextResponse.json({ canEdit: false, role: null });
  }
}

