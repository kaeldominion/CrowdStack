"use client";

import { useState, useEffect } from "react";
import { Card } from "@crowdstack/ui";
import { Radio, Eye, Users, Calendar } from "lucide-react";

export default function DJAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    mixesCount: 0,
    draftMixesCount: 0,
    featuredMixesCount: 0,
    totalPlays: 0,
    followerCount: 0,
    upcomingEventsCount: 0,
    pastEventsCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/dj/dashboard-stats");
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Analytics</h1>
        <p className="mt-2 text-sm text-secondary">Overview of your DJ profile performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-medium mb-2">Total Plays</p>
              <p className="text-3xl font-bold tracking-tighter text-primary">{stats.totalPlays.toLocaleString()}</p>
                </div>
                <Eye className="h-5 w-5 text-muted" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-medium mb-2">Followers</p>
              <p className="text-3xl font-bold tracking-tighter text-primary">{stats.followerCount}</p>
                </div>
                <Users className="h-5 w-5 text-muted" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-medium mb-2">Published Mixes</p>
              <p className="text-3xl font-bold tracking-tighter text-primary">{stats.mixesCount}</p>
                </div>
                <Radio className="h-5 w-5 text-muted" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted font-medium mb-2">Upcoming Events</p>
              <p className="text-3xl font-bold tracking-tighter text-primary">{stats.upcomingEventsCount}</p>
                </div>
                <Calendar className="h-5 w-5 text-muted" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Additional Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-secondary mb-1">Draft Mixes</p>
            <p className="text-2xl font-bold text-primary">{stats.draftMixesCount}</p>
          </div>
          <div>
            <p className="text-sm text-secondary mb-1">Featured Mixes</p>
            <p className="text-2xl font-bold text-primary">{stats.featuredMixesCount}</p>
          </div>
          <div>
            <p className="text-sm text-secondary mb-1">Past Events</p>
            <p className="text-2xl font-bold text-primary">{stats.pastEventsCount}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-sm text-secondary">
          More detailed analytics and charts coming soon.
        </p>
      </Card>
    </div>
  );
}



