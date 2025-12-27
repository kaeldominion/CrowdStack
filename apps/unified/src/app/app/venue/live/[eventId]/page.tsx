"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Users, Activity, Clock } from "lucide-react";
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
        <LoadingSpinner text="Loading live metrics..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Live Mission Control</h1>
          <p className="mt-2 text-sm text-secondary">Real-time event monitoring</p>
        </div>
        <Badge variant="success" className="flex items-center gap-2">
          <div className="h-2 w-2 bg-accent-success rounded-full animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Hero Metric - Live Attendance */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
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
              <div className="mt-4 h-2 bg-raised rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary transition-all duration-500"
                  style={{ width: `${metrics.capacity_percentage}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10 border border-accent-success/30">
            <Activity className="h-8 w-8 text-accent-success animate-pulse" />
          </div>
        </div>
      </Card>

      {/* Flow Rate Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card padding="compact">
          <div className="space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Last 15 Min</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_15min}
            </p>
          </div>
        </Card>

        <Card padding="compact">
          <div className="space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Last Hour</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_hour}
            </p>
          </div>
        </Card>

        <Card padding="compact">
          <div className="space-y-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Peak Hour</p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-primary">
              {metrics.peak_hour || "—"}
            </p>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Recent Activity</h2>
            <Clock className="h-4 w-4 text-muted" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.recent_checkins.slice(0, 10).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded-lg bg-raised"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{checkin.attendee_name}</p>
                  {checkin.promoter_name && (
                    <p className="text-xs text-secondary">via {checkin.promoter_name}</p>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {new Date(checkin.checked_in_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
