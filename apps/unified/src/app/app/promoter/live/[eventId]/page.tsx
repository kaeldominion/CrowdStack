"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Users, Trophy, Bell } from "lucide-react";
import type { LiveMetrics } from "@/lib/data/live-metrics";

export default function PromoterLiveMissionControlPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(0);
  const [myCheckIns, setMyCheckIns] = useState(0);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    // Find my promoter stats
    if (metrics) {
      // This would need to get current user's promoter ID
      // For now, using first promoter as example
      const myStats = metrics.promoter_stats.find((p) => p.rank <= 5);
      if (myStats) {
        setMyRank(myStats.rank);
        setMyCheckIns(myStats.check_ins);
      }
    }
  }, [metrics]);

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
          <p className="mt-2 text-sm text-secondary">Your real-time performance</p>
        </div>
        <Badge variant="success" className="flex items-center gap-2">
          <div className="h-2 w-2 bg-accent-success rounded-full animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Hero Metric - My Check-ins */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
              My Check-ins
            </p>
            <p className="text-6xl font-mono font-bold tracking-tighter text-primary">
              {myCheckIns}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <Badge variant="primary">#{myRank || "—"} of {metrics.promoter_stats.length}</Badge>
              <span className="text-sm text-secondary">Leaderboard position</span>
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-secondary/10 border border-accent-secondary/30">
            <Users className="h-8 w-8 text-accent-secondary animate-pulse" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-header">Top Promoters</h2>
              <Trophy className="h-4 w-4 text-muted" />
            </div>
            <div className="space-y-2">
              {metrics.promoter_stats.slice(0, 5).map((promoter) => (
                <div
                  key={promoter.promoter_id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    promoter.rank === myRank
                      ? "bg-accent-secondary/10 border border-accent-secondary/30"
                      : "bg-raised"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        promoter.rank === myRank
                          ? "bg-accent-secondary text-white"
                          : "bg-active text-secondary"
                      }`}
                    >
                      #{promoter.rank}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {promoter.promoter_name}
                        {promoter.rank === myRank && " (You)"}
                      </p>
                      <p className="text-xs text-secondary">{promoter.check_ins} check-ins</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Guest Arrivals */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-header">Recent Guest Arrivals</h2>
              <Bell className="h-4 w-4 text-muted" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.recent_checkins
                .filter((c) => c.promoter_name) // Filter to my guests only
                .slice(0, 10)
                .map((checkin) => (
                  <div
                    key={checkin.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-accent-success/10 border border-accent-success/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary">{checkin.attendee_name}</p>
                      <p className="text-xs text-accent-success">Just arrived!</p>
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
    </div>
  );
}
