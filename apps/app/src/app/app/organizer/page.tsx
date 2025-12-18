import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRole } from "@crowdstack/shared/auth/roles";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BentoCard } from "@/components/BentoCard";
import { Calendar, Users, Ticket, TrendingUp, BarChart3, Activity } from "lucide-react";

export default async function OrganizerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getUserRole();

  // TODO: Fetch actual data
  const stats = {
    totalEvents: 0,
    registrations: 0,
    checkIns: 0,
    promoters: 0,
    conversionRate: 0,
    revenue: 0,
  };

  return (
    <DashboardLayout role={role as any} userEmail={user?.email}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Overview of your events and performance
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

          {/* Larger cards for detailed metrics */}
          <BentoCard span={2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Conversion Rate</p>
                <Activity className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tighter text-white">{stats.conversionRate}%</p>
                <span className="text-sm text-white/40">vs last month</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${stats.conversionRate}%` }} />
              </div>
            </div>
          </BentoCard>

          <BentoCard span={2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Total Revenue</p>
                <BarChart3 className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tighter text-white">${stats.revenue.toLocaleString()}</p>
                <span className="text-sm text-white/40">this month</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-medium">+12.4%</span>
                <span className="text-white/40">vs last month</span>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

