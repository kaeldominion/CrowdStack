import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import type { HealthCheckResult } from "@crowdstack/shared";

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

    return NextResponse.json(result);
  } catch (error) {
    const result: HealthCheckResult = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: new Date().toISOString(),
      supabaseConnected: false,
    };

    console.error("[Health Check] Error:", error);

    return NextResponse.json(result, { status: 500 });
  }
}

