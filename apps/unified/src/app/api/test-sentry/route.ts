import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Test server-side error tracking
    throw new Error("Test server-side error from Sentry");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { 
        message: "Test error sent to Sentry! Check your dashboard.",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

