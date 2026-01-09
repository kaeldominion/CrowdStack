import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import type { ActivityActionType, ActivityEntityType } from "@crowdstack/shared/activity/log-activity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get("user_id");
    const entityType = searchParams.get("entity_type") as ActivityEntityType | null;
    const entityId = searchParams.get("entity_id");
    const actionType = searchParams.get("action_type") as ActivityActionType | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Build query
    let query = supabase
      .from("activity_logs")
      .select(`
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        metadata,
        created_at,
        users:user_id (
          id,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filterUserId) {
      query = query.eq("user_id", filterUserId);
    }
    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }
    if (actionType) {
      query = query.eq("action_type", actionType);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error("[Activity Logs API] Error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch activity logs" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true });

    if (filterUserId) countQuery = countQuery.eq("user_id", filterUserId);
    if (entityType) countQuery = countQuery.eq("entity_type", entityType);
    if (entityId) countQuery = countQuery.eq("entity_id", entityId);
    if (actionType) countQuery = countQuery.eq("action_type", actionType);
    if (startDate) countQuery = countQuery.gte("created_at", startDate);
    if (endDate) countQuery = countQuery.lte("created_at", endDate);

    const { count } = await countQuery;

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[Activity Logs API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

