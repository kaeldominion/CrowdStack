import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserDJIds } from "@/lib/data/get-user-entity";
import { cookies } from "next/headers";

const SELECTED_DJ_COOKIE = "selected_dj_id";

/**
 * POST /api/dj/select-profile
 * Set the selected DJ profile for the current user
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dj_id } = body;

    if (!dj_id) {
      return NextResponse.json({ error: "dj_id is required" }, { status: 400 });
    }

    // Verify user owns this DJ profile
    const allDJIds = await getUserDJIds();
    if (!allDJIds.includes(dj_id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SELECTED_DJ_COOKIE, dj_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return NextResponse.json({ success: true, selected_dj_id: dj_id });
  } catch (error: any) {
    console.error("Error selecting DJ profile:", error);
    return NextResponse.json(
      { error: error.message || "Failed to select DJ profile" },
      { status: 500 }
    );
  }
}

