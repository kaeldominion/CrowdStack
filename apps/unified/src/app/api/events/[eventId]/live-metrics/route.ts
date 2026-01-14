import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getLiveMetrics } from "@/lib/data/live-metrics";
import { cookies } from "next/headers";
import { CACHE, getCacheControl } from "@/lib/cache";

// Real-time route - explicitly disable caching
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    // SECURITY: Only allow localhost fallback in non-production environments
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        console.warn("[Live Metrics API] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Live Metrics API] Fetching metrics for event ${eventId}`);

    const metrics = await getLiveMetrics(eventId);

    if (!metrics) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log(`[Live Metrics API] Returning metrics:`, {
      current_attendance: metrics.current_attendance,
      total_registrations: metrics.total_registrations,
      capacity: metrics.capacity,
    });

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': getCacheControl(CACHE.realtime),
      },
    });
  } catch (error: any) {
    console.error("[Live Metrics API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch live metrics" },
      { status: 500 }
    );
  }
}

