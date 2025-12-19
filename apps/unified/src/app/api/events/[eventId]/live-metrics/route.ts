import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getLiveMetrics } from "@/lib/data/live-metrics";

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getLiveMetrics(params.eventId);

    if (!metrics) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch live metrics" },
      { status: 500 }
    );
  }
}

