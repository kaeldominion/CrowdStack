import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/admin/xp-ledger
 * Get XP ledger entries with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get("user_id");
    const eventId = searchParams.get("event_id");
    const sourceType = searchParams.get("source_type");
    const roleContext = searchParams.get("role_context");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    
    // Build query - get XP ledger entries
    let query = supabase
      .from("xp_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (eventId) {
      query = query.eq("event_id", eventId);
    }
    if (sourceType) {
      query = query.eq("source_type", sourceType);
    }
    if (roleContext) {
      query = query.eq("role_context", roleContext);
    }
    
    const { data: entries, error } = await query;
    
    if (error) {
      console.error("[XP Ledger] Error fetching entries:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Enrich entries with user and event data
    const enrichedEntries = await Promise.all(
      (entries || []).map(async (entry: any) => {
        const enriched: any = { ...entry };
        
        // Get user email if user_id exists
        if (entry.user_id) {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(entry.user_id);
            if (userData?.user) {
              enriched.user = {
                id: userData.user.id,
                email: userData.user.email,
              };
            }
          } catch (err) {
            console.warn(`[XP Ledger] Could not fetch user ${entry.user_id}:`, err);
          }
        }
        
        // Get event info if event_id exists
        if (entry.event_id) {
          try {
            const { data: eventData } = await supabase
              .from("events")
              .select("id, name, slug")
              .eq("id", entry.event_id)
              .single();
            if (eventData) {
              enriched.event = eventData;
            }
          } catch (err) {
            console.warn(`[XP Ledger] Could not fetch event ${entry.event_id}:`, err);
          }
        }
        
        return enriched;
      })
    );
    
    // Get total count for pagination
    let countQuery = supabase
      .from("xp_ledger")
      .select("*", { count: "exact", head: true });
    
    if (userId) countQuery = countQuery.eq("user_id", userId);
    if (eventId) countQuery = countQuery.eq("event_id", eventId);
    if (sourceType) countQuery = countQuery.eq("source_type", sourceType);
    if (roleContext) countQuery = countQuery.eq("role_context", roleContext);
    
    const { count } = await countQuery;
    
    // Get summary stats
    let summaryQuery = supabase
      .from("xp_ledger")
      .select("amount, source_type, role_context");
    
    if (userId) summaryQuery = summaryQuery.eq("user_id", userId);
    if (eventId) summaryQuery = summaryQuery.eq("event_id", eventId);
    if (sourceType) summaryQuery = summaryQuery.eq("source_type", sourceType);
    if (roleContext) summaryQuery = summaryQuery.eq("role_context", roleContext);
    
    const { data: allEntries } = await summaryQuery;
    
    const totalXP = allEntries?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const positiveXP = allEntries?.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0) || 0;
    const negativeXP = allEntries?.filter(e => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0;
    
    return NextResponse.json({
      entries: enrichedEntries || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary: {
        totalXP,
        positiveXP,
        negativeXP,
        entryCount: count || 0,
      },
    });
  } catch (error: any) {
    console.error("[XP Ledger] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

