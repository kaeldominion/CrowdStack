import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserRole } from "@crowdstack/shared/auth/roles";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BentoCard } from "@/components/BentoCard";
import { Ticket, TrendingUp, DollarSign, Trophy, Target, Zap } from "lucide-react";

export default async function PromoterDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = await getUserRole();

  // TODO: Fetch actual data
  const stats = {
    totalCheckIns: 0,
    conversionRate: 0,
    totalEarnings: 0,
    rank: 0,
    referrals: 0,
    avgPerEvent: 0,
  };

  return (
    <DashboardLayout role={role as any} userEmail={user?.email}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            Track your referrals and earnings
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Conversion Rate</p>
                <p className="text-3xl font-bold tracking-tighter text-white">{stats.conversionRate}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Earnings</p>
                <p className="text-3xl font-bold tracking-tighter text-white">${stats.totalEarnings}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                <DollarSign className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </BentoCard>

          {/* Larger cards */}
          <BentoCard span={2}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Leaderboard Rank</p>
                <Trophy className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tighter text-white">#{stats.rank}</p>
                <span className="text-sm text-white/40">out of 150 promoters</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(150 - stats.rank) / 150 * 100}%` }} />
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Total Referrals</p>
                <Target className="h-4 w-4 text-white/40" />
              </div>
              <p className="text-3xl font-bold tracking-tighter text-white">{stats.referrals}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-400 font-medium">+8.2%</span>
                <span className="text-white/40">this month</span>
              </div>
            </div>
          </BentoCard>

          <BentoCard span={3}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Average Per Event</p>
                <Zap className="h-4 w-4 text-white/40" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tracking-tighter text-white">{stats.avgPerEvent}</p>
                <span className="text-sm text-white/40">check-ins per event</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Best Event</p>
                  <p className="text-lg font-semibold text-white">142</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">This Month</p>
                  <p className="text-lg font-semibold text-white">98</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Trend</p>
                  <p className="text-lg font-semibold text-emerald-400">↑ 12%</p>
                </div>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

