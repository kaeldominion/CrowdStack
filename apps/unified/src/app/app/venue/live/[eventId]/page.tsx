"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BentoCard } from "@/components/BentoCard";
import { Badge } from "@crowdstack/ui";
import { Users, Activity, AlertTriangle, Clock } from "lucide-react";
import type { LiveMetrics } from "@/lib/data/live-metrics";

export default function VenueLiveMissionControlPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/live-metrics`);
      if (!response.ok) throw new Error("Failed to load metrics");
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading live metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Live Mission Control</h1>
          <p className="mt-2 text-sm text-secondary">Real-time event monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-accent-success rounded-full animate-pulse" />
          <span className="text-sm text-secondary">Live</span>
        </div>
      </div>

      <BentoCard span={4}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted font-medium mb-2">
              Live Attendance
            </p>
            <div className="flex items-baseline gap-4">
              <p className="text-6xl font-mono font-bold tracking-tighter text-primary">
                {metrics.current_attendance}
              </p>
              {metrics.capacity && (
                <>
                  <span className="text-2xl text-muted">/</span>
                  <p className="text-4xl font-mono font-bold tracking-tighter text-secondary">
                    {metrics.capacity}
                  </p>
                </>
              )}
            </div>
            {metrics.capacity && (
              <div className="mt-4 h-2 bg-glass rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-accent-success/80 via-accent-success/40 to-accent-success/80 transition-all duration-500"
                  style={{ width: `${metrics.capacity_percentage}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/20 border border-accent-success/50">
            <Activity className="h-8 w-8 text-accent-success animate-pulse" />
          </div>
        </div>
      </BentoCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted font-medium">Last 15 Min</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_15min}
            </p>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted font-medium">Last Hour</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_hour}
            </p>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted font-medium">Peak Hour</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.peak_hour || "—"}
            </p>
          </div>
        </BentoCard>
      </div>

      <BentoCard span={2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-primary">Recent Activity</p>
            <Clock className="h-4 w-4 text-muted" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.recent_checkins.slice(0, 10).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded-md bg-glass"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{checkin.attendee_name}</p>
                  {checkin.promoter_name && (
                    <p className="text-xs text-muted">via {checkin.promoter_name}</p>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {new Date(checkin.checked_in_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </BentoCard>
    </div>
  );
}
