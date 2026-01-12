import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/diagnostics
 * Diagnostic tool to query database entries by slug
 * Query params: ?type=venue|promoter&slug=<slug>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "venue" or "promoter"
    const slug = searchParams.get("slug");

    if (!type || !slug) {
      return NextResponse.json(
        { error: "Missing required params: type and slug" },
        { status: 400 }
      );
    }

    if (type !== "venue" && type !== "promoter") {
      return NextResponse.json(
        { error: "Type must be 'venue' or 'promoter'" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    if (type === "venue") {
      // Get venue by slug
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("slug", slug)
        .single();

      if (venueError || !venue) {
        // Check for multiple records with same slug
        const { data: venues, error: multipleError } = await supabase
          .from("venues")
          .select("*")
          .eq("slug", slug);

        if (multipleError) {
          return NextResponse.json(
            { error: multipleError.message, queryError: true },
            { status: 500 }
          );
        }

        return NextResponse.json({
          type: "venue",
          slug,
          found: false,
          count: venues?.length || 0,
          records: venues || [],
          error: venueError?.message || "No venue found with this slug",
        });
      }

      // Get all venues with this slug (check for duplicates)
      const { data: allVenues, error: allError } = await supabase
        .from("venues")
        .select("id, name, slug, updated_at")
        .eq("slug", slug);

      return NextResponse.json({
        type: "venue",
        slug,
        found: true,
        count: allVenues?.length || 1,
        record: venue,
        allRecordsWithSlug: allVenues || [],
        timestamp: new Date().toISOString(),
      });
    } else {
      // Get promoter by slug
      const { data: promoter, error: promoterError } = await supabase
        .from("promoters")
        .select("*")
        .eq("slug", slug)
        .single();

      if (promoterError || !promoter) {
        // Check for multiple records with same slug
        const { data: promoters, error: multipleError } = await supabase
          .from("promoters")
          .select("*")
          .eq("slug", slug);

        if (multipleError) {
          return NextResponse.json(
            { error: multipleError.message, queryError: true },
            { status: 500 }
          );
        }

        return NextResponse.json({
          type: "promoter",
          slug,
          found: false,
          count: promoters?.length || 0,
          records: promoters || [],
          error: promoterError?.message || "No promoter found with this slug",
        });
      }

      // Get all promoters with this slug (check for duplicates)
      const { data: allPromoters, error: allError } = await supabase
        .from("promoters")
        .select("id, name, slug, user_id, created_by, updated_at")
        .eq("slug", slug);

      return NextResponse.json({
        type: "promoter",
        slug,
        found: true,
        count: allPromoters?.length || 1,
        record: promoter,
        allRecordsWithSlug: allPromoters || [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error("[Diagnostics API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
