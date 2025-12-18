"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@crowdstack/ui";
import { Calendar, TrendingUp, Ticket, Repeat, BarChart3, Users, Plus } from "lucide-react";
import Link from "next/link";

export default function VenueDashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    thisMonth: 0,
    totalCheckIns: 0,
    repeatRate: 0,
    avgAttendance: 0,
    topEvent: "N/A",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/venue/dashboard-stats");
      if (!response.ok) throw new Error("Failed to load stats");
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="venue_admin" userEmail="">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
            <p className="mt-2 text-sm text-white/60">
              Overview of your venue performance
            </p>
          </div>
          <Link href="/app/venue/events/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
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
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">This Month</p>
                <p className="text-3xl font-bold tracking-tighter text-white">{stats.thisMonth}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Check-ins</p>
                <p className="text-3xl font-bold tracking-tighter text-white">{stats.totalCheckIns}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
                <Ticket className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Repeat Rate</p>
                <p className="text-3xl font-bold tracking-tighter text-white">{stats.repeatRate}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                <Repeat className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </BentoCard>

          {/* Larger cards */}
          <BentoCard span={2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Average Attendance</p>
                <Users className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tighter text-white">{stats.avgAttendance}</p>
                <span className="text-sm text-white/40">per event</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: "75%" }}
                />
              </div>
            </div>
          </BentoCard>

          <BentoCard span={2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Top Performing Event</p>
                <BarChart3 className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-2xl font-bold tracking-tighter text-white">{stats.topEvent}</p>
            </div>
          </BentoCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
