"use client";

import { useState, useEffect, memo } from "react";
import { Card, Badge, LoadingSpinner, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@crowdstack/ui";
import {
  TrendingUp,
  Users,
  UserCheck,
  Percent,
  Calendar,
  Trophy,
  Info,
  ShieldCheck,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PromoterPerformance {
  rank: number;
  name: string;
  checkins: number;
  referrals: number;
  conversion_rate: number;
}

interface MonthlyTrend {
  month: string;
  registrations: number;
  checkins: number;
}

interface OrganizerInsights {
  total_registrations: number;
  total_checkins: number;
  show_rate: number;
  events_count: number;
  avg_checkins_per_event: number;
  promoter_performance: {
    total_promoters: number;
    total_referrals: number;
    avg_conversion_rate: number;
    top_promoters: PromoterPerformance[];
  };
  monthly_trends: MonthlyTrend[];
}

// Memoized chart component
const TrendsChart = memo(function TrendsChart({ data }: { data: MonthlyTrend[] }) {
  // Format month for display
  const chartData = data.map(d => ({
    ...d,
    month: formatMonth(d.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRegOrg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCheckOrg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
        />
        <YAxis
          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141821",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            color: "#fff",
          }}
        />
        <Area
          type="monotone"
          dataKey="registrations"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRegOrg)"
          name="Registrations"
        />
        <Area
          type="monotone"
          dataKey="checkins"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCheckOrg)"
          name="Check-ins"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

export default function OrganizerInsightsPage() {
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/organizer/insights");
      if (!response.ok) {
        throw new Error("Failed to load insights");
      }
      const data = await response.json();
      setInsights(data.insights);
    } catch (err: any) {
      console.error("Failed to load insights:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Event Insights</h1>
        <Card className="p-6">
          <p className="text-error">Failed to load insights: {error}</p>
        </Card>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Event Insights</h1>
        <Card className="p-6">
          <p className="text-secondary">No insights data available.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Event Insights</h1>
        <p className="mt-2 text-sm text-secondary">
          Aggregated performance metrics across your events
        </p>
      </div>

      {/* Data Policy Notice */}
      <Card className="bg-accent-secondary/10 border-accent-secondary/20">
        <div className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-accent-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Data Privacy Policy</p>
            <p className="text-sm text-secondary mt-1">
              CrowdStack protects attendee privacy. These insights are aggregated and read-only.
              Individual contact information is not available for export. Use messaging features
              within CrowdStack to communicate with your audience.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Registrations</p>
              <p className="text-2xl font-bold text-primary">
                {insights.total_registrations.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/20">
              <UserCheck className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Check-ins</p>
              <p className="text-2xl font-bold text-primary">
                {insights.total_checkins.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Show Rate</p>
              <p className="text-2xl font-bold text-primary">
                {insights.show_rate}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/20">
              <Calendar className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Events</p>
              <p className="text-2xl font-bold text-primary">
                {insights.events_count}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-secondary/20">
              <TrendingUp className="h-5 w-5 text-accent-secondary" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Avg Check-ins/Event</p>
              <p className="text-xl font-bold text-primary">
                {insights.avg_checkins_per_event}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Trophy className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Active Promoters</p>
              <p className="text-xl font-bold text-primary">
                {insights.promoter_performance.total_promoters}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20">
              <Users className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider">Promoter Referrals</p>
              <p className="text-xl font-bold text-primary">
                {insights.promoter_performance.total_referrals.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-primary">Monthly Trends</h2>
          <p className="text-xs text-secondary">Registration and check-in activity over the last 12 months</p>
        </div>
        <TrendsChart data={insights.monthly_trends} />
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-xs text-secondary">Registrations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-primary" />
            <span className="text-xs text-secondary">Check-ins</span>
          </div>
        </div>
      </Card>

      {/* Promoter Performance Table */}
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Promoter Performance</h2>
            <p className="text-xs text-secondary">
              Top promoters by check-ins (aggregated data only)
            </p>
          </div>
          <Badge variant="secondary">
            Avg Conversion: {insights.promoter_performance.avg_conversion_rate}%
          </Badge>
        </div>

        {insights.promoter_performance.top_promoters.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-secondary text-sm">No promoter activity yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Promoter</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Check-ins</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.promoter_performance.top_promoters.map((promoter) => (
                  <TableRow key={promoter.rank}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {promoter.rank <= 3 ? (
                          <Trophy
                            className={`h-4 w-4 ${
                              promoter.rank === 1
                                ? "text-yellow-400"
                                : promoter.rank === 2
                                ? "text-gray-300"
                                : "text-amber-600"
                            }`}
                          />
                        ) : (
                          <span className="text-secondary">#{promoter.rank}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{promoter.name}</TableCell>
                    <TableCell className="text-right text-secondary">
                      {promoter.referrals.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {promoter.checkins.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={promoter.conversion_rate >= 70 ? "success" : promoter.conversion_rate >= 50 ? "warning" : "secondary"}
                      >
                        {promoter.conversion_rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Privacy Note */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-secondary">
              Promoter contact details are managed in your Promoters section. CrowdStack protects
              attendee privacy - contact data is not available for bulk export. Use in-app
              messaging to communicate with your audience.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
