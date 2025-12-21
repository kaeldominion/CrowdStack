"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { EarningsChart } from "@/components/charts/EarningsChart";
import { Button } from "@crowdstack/ui";
import { Ticket, TrendingUp, DollarSign, Trophy, Calendar, ExternalLink, QrCode, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  status: string;
  venue?: { name: string } | null;
  registrations: number;
  checkins: number;
}

export default function PromoterDashboardPage() {
  const [stats, setStats] = useState({
    totalCheckIns: 0,
    conversionRate: 0,
    totalEarnings: 0,
    rank: 0,
    referrals: 0,
    avgPerEvent: 0,
  });
  const [earningsChartData, setEarningsChartData] = useState<Array<{ date: string; earnings: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadStats();
    loadRecentEvents();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/promoter/dashboard-stats");
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      setStats(data.stats || stats);
      setEarningsChartData(data.earningsChartData || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const response = await fetch("/api/promoter/events/my");
      if (response.ok) {
        const data = await response.json();
        // Get the 5 most recent events
        const events = (data.events || []).slice(0, 5);
        setRecentEvents(events);
      }
    } catch (error) {
      console.error("Error loading recent events:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Track your referrals and earnings
          </p>
        </div>
        <Link href="/me" target="_blank">
          <Button variant="secondary">
            <ExternalLink className="h-4 w-4 mr-2" />
            View My Profile
          </Button>
        </Link>
      </div>

      {/* Recent Events Section */}
      {recentEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Events
            </h2>
            <Link href="/app/promoter/events">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentEvents.map((event) => (
              <Link key={event.id} href={`/app/promoter/events/${event.id}`}>
                <BentoCard className="hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white truncate">
                        {event.name}
                      </h3>
                      {event.venue && (
                        <p className="text-xs text-white/60 mt-1">
                          {event.venue.name}
                        </p>
                      )}
                      <p className="text-xs text-white/40 mt-1">
                        {new Date(event.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Ticket className="h-3 w-3 text-white/40" />
                        <span className="text-white/60">
                          {event.registrations || 0} registered
                        </span>
                      </div>
                    </div>
                  </div>
                </BentoCard>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.referrals}</p>
            </div>
            <Ticket className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.totalCheckIns}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Estimated Payout</p>
              <p className="text-3xl font-bold tracking-tighter text-white font-mono">${stats.totalEarnings}</p>
            </div>
            <DollarSign className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Check-ins</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.totalCheckIns}</p>
            </div>
            <Ticket className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Conversion Rate</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.conversionRate}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Leaderboard Rank</p>
              <p className="text-3xl font-bold tracking-tighter text-white">#{stats.rank || "—"}</p>
            </div>
            <Trophy className="h-5 w-5 text-white/40" />
          </div>
        </BentoCard>
      </div>

      {/* Earnings Chart */}
      {earningsChartData.length > 0 && (
        <BentoCard span={3}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Earnings Over Time</p>
              <DollarSign className="h-4 w-4 text-white/40" />
            </div>
            <EarningsChart data={earningsChartData} height={250} />
          </div>
        </BentoCard>
      )}
    </div>
  );
}
