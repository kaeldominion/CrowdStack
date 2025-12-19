"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { RegistrationChart } from "@/components/charts/RegistrationChart";
import { Button } from "@crowdstack/ui";
import { Calendar, Users, Ticket, TrendingUp, BarChart3, Activity, Plus, Zap } from "lucide-react";
import Link from "next/link";

export default function OrganizerDashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    registrations: 0,
    checkIns: 0,
    promoters: 0,
    conversionRate: 0,
    revenue: 0,
  });
  const [chartData, setChartData] = useState<Array<{ date: string; registrations: number; checkins: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/organizer/dashboard-stats");
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      setStats(data.stats || stats);
      setChartData(data.chartData || []);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Overview of your events and performance
          </p>
        </div>
        <Link href="/app/organizer/events/new">
          <Button className="relative overflow-hidden group">
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </span>
          </Button>
        </Link>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Events</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.totalEvents}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Calendar className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.registrations}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
              <Ticket className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.checkIns}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Promoters</p>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.promoters}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </BentoCard>

        {/* Chart Card */}
        <BentoCard span={4}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Registrations vs Check-ins</p>
              <BarChart3 className="h-4 w-4 text-white/40" />
            </div>
            {chartData.length > 0 ? (
              <RegistrationChart data={chartData} height={250} />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-white/40">
                No data available yet
              </div>
            )}
          </div>
        </BentoCard>

        {/* Conversion Rate */}
        <BentoCard span={2}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Conversion Rate</p>
              <Activity className="h-4 w-4 text-white/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tighter text-white">{stats.conversionRate}%</p>
              <span className="text-sm text-white/40">registrations → check-ins</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(stats.conversionRate, 100)}%` }}
              />
            </div>
          </div>
        </BentoCard>

        {/* Revenue */}
        <BentoCard span={2}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Total Revenue</p>
              <BarChart3 className="h-4 w-4 text-white/40" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tighter text-white font-mono">
                ${stats.revenue.toLocaleString()}
              </p>
              <span className="text-sm text-white/40">this month</span>
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
