import { NextRequest, NextResponse } from "next/server";
import { processQueuedFeedbackRequests } from "@crowdstack/shared/email/feedback-request";

/**
 * POST /api/cron/process-feedback-requests
 * Process queued feedback requests (called by cron job)
 * 
 * This endpoint should be protected by a secret token or similar
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processQueuedFeedbackRequests();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[Cron] Error processing feedback requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
