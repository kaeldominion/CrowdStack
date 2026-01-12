import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/feedback/categories
 * Get all feedback categories
 * Public endpoint (no auth required)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: categories, error } = await supabase
      .from("event_feedback_categories")
      .select("id, code, label, display_order")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[Feedback Categories] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      categories: categories || [],
    });
  } catch (error: any) {
    console.error("[Feedback Categories] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
