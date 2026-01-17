import { NextRequest, NextResponse } from "next/server";
import { processQueuedFeedbackRequests } from "@crowdstack/shared/email/feedback-request";

/**
 * GET/POST /api/cron/process-feedback-requests
 * Process queued feedback requests and send feedback emails after events
 * Should be called by cron job (Vercel crons send GET requests)
 */
export const dynamic = "force-dynamic";

// Vercel cron jobs send GET requests
export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  try {
    // Verify cron secret or Vercel cron header
    const authHeader = request.headers.get("authorization");
    const vercelCronHeader = request.headers.get("x-vercel-cron");

    // Allow if called by Vercel cron job OR if CRON_SECRET matches
    const isVercelCron = vercelCronHeader === "1";
    const isValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isVercelCron && !isValidSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Feedback Cron] Processing queued feedback requests...");
    const result = await processQueuedFeedbackRequests();

    console.log(`[Feedback Cron] Completed. Processed: ${result.processed}, Errors: ${result.errors}`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("[Feedback Cron] Error processing feedback requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
