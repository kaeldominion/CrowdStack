import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/server";
import type { HealthCheckResult } from "@crowdstack/shared";

// Force dynamic rendering since we use cookies() via createClient()
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Test Supabase connection
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("healthcheck")
      .select("id")
      .limit(1)
      .single();

    const supabaseConnected = !error && data !== null;

    const result: HealthCheckResult = {
      status: supabaseConnected ? "ok" : "error",
      message: supabaseConnected
        ? "All systems operational"
        : error?.message || "Supabase connection failed",
      timestamp: new Date().toISOString(),
      supabaseConnected,
    };

    // Log health check
    console.log(
      `[Health Check] ${result.status.toUpperCase()} - Supabase: ${
        supabaseConnected ? "Connected" : "Disconnected"
      } - ${Date.now() - startTime}ms`
    );

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    const result: HealthCheckResult = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      supabaseConnected: false,
    };

    if (process.env.NODE_ENV === "development") {
      console.error("[Health Check] Error:", error);
    }

    return NextResponse.json(result, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

