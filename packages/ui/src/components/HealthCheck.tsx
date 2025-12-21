"use client";

import { useEffect, useState } from "react";
import type { HealthCheckResult } from "@crowdstack/shared";
import { InlineSpinner } from "./InlineSpinner";

export function HealthCheck() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setResult(data);
      } catch (error) {
        setResult({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          supabaseConnected: false,
        });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <InlineSpinner size="sm" className="text-blue-600" />
          <p className="text-sm text-gray-600">Checking health...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        System Health Check
      </h2>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              result.status === "ok"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {result.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Supabase:</span>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              result.supabaseConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {result.supabaseConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Message:</span>
          <span className="text-sm text-gray-900">{result.message}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Timestamp:</span>
          <span className="text-sm text-gray-900">
            {new Date(result.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

