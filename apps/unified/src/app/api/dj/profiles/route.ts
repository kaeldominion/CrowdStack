import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/dj/profiles
 * Get all DJ profiles for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profiles: [] });
    }

    const { data: profiles, error } = await supabase
      .from("djs")
      .select("id, name, handle, profile_image_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching DJ profiles:", error);
      return NextResponse.json({ profiles: [] });
    }

    return NextResponse.json({ profiles: profiles || [] });
  } catch (error: any) {
    console.error("Error fetching DJ profiles:", error);
    return NextResponse.json({ profiles: [] });
  }
}

