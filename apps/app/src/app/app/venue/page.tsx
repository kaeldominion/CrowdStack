import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRole } from "@crowdstack/shared/auth/roles";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BentoCard } from "@/components/BentoCard";
import { Calendar, TrendingUp, Ticket, Repeat, BarChart3, Users } from "lucide-react";

export default async function VenueDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getUserRole();

  // TODO: Fetch actual data
  const stats = {
    totalEvents: 0,
    thisMonth: 0,
    totalCheckIns: 0,
    repeatRate: 0,
    avgAttendance: 0,
    topEvent: "N/A",
  };

  return (
    <DashboardLayout role={role as any} userEmail={user?.email}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Overview of your venue performance
          </p>
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
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: "75%" }} />
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
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-medium">+24.8%</span>
                <span className="text-white/40">vs average</span>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

