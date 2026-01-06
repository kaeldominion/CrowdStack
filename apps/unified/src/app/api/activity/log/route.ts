import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { logActivity } from "@crowdstack/shared/activity/log-activity";
import type { ActivityActionType, ActivityEntityType, ActivityMetadata } from "@crowdstack/shared/activity/log-activity";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      action_type,
      entity_type,
      entity_id,
      metadata,
    }: {
      action_type: ActivityActionType;
      entity_type: ActivityEntityType;
      entity_id?: string | null;
      metadata?: ActivityMetadata;
    } = body;

    if (!action_type || !entity_type) {
      return NextResponse.json(
        { error: "action_type and entity_type are required" },
        { status: 400 }
      );
    }

    const logId = await logActivity(
      user.id,
      action_type,
      entity_type,
      entity_id,
      metadata
    );

    return NextResponse.json({ success: true, log_id: logId });
  } catch (error: any) {
    console.error("[Activity Log API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log activity" },
      { status: 500 }
    );
  }
}

