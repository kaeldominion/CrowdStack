import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getLiveMetrics } from "@/lib/data/live-metrics";
import { cookies } from "next/headers";
import { CACHE, getCacheControl } from "@/lib/cache";

// Real-time route - explicitly disable caching
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Support localhost dev mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Live Metrics API] Fetching metrics for event ${params.eventId}`);

    const metrics = await getLiveMetrics(params.eventId);

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

