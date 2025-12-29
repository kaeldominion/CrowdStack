"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Container, Section, LoadingSpinner } from "@crowdstack/ui";
import {
  Users,
  Calendar,
  Ticket,
  UserCheck,
  Building2,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Megaphone,
  Radio,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalAttendees: number;
    totalEvents: number;
    totalRegistrations: number;
    totalCheckins: number;
    totalVenues: number;
    totalOrganizers: number;
    totalPromoters: number;
    totalDJs: number;
    registrationGrowth: number;
  };
  roleDistribution: { role: string; count: number }[];
  eventsByStatus: { status: string; count: number }[];
  registrationsTrend: { date: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  topEvents: { id: string; name: string; slug: string; registrations: number }[];
  topPromoters: { id: string; name: string; referrals: number }[];
  topOrganizers: { id: string; name: string; eventCount: number }[];
  topDJs: { id: string; name: string; handle: string; profileImageUrl: string | null; verified: boolean; eventCount: number }[];
  topReferrers: { userId: string; name: string; referrals: number }[];
  recentEvents: { id: string; name: string; status: string; createdAt: string }[];
}

// Color palette for charts
const COLORS = {
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  muted: "#6B7280",
};

const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  published: "#10B981",
  ended: "#8B5CF6",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Section spacing="lg">
        <Container>
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" text="Loading analytics..." />
          </div>
        </Container>
      </Section>
    );
  }

  if (error) {
    return (
      <Section spacing="lg">
        <Container>
          <Card className="border-danger/20 bg-danger/5">
            <p className="text-danger">Error loading analytics: {error}</p>
          </Card>
        </Container>
      </Section>
    );
  }

  if (!data) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  return (
    <Section spacing="lg">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Analytics</h1>
          <p className="text-sm text-secondary">
            Platform-wide metrics and insights
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Attendees"
            value={formatNumber(data.overview.totalAttendees)}
            icon={<Users className="h-5 w-5" />}
            color="primary"
          />
          <StatCard
            title="Total Events"
            value={formatNumber(data.overview.totalEvents)}
            icon={<Calendar className="h-5 w-5" />}
            color="secondary"
          />
          <StatCard
            title="Registrations"
            value={formatNumber(data.overview.totalRegistrations)}
            icon={<Ticket className="h-5 w-5" />}
            color="success"
            trend={data.overview.registrationGrowth}
          />
          <StatCard
            title="Check-ins"
            value={formatNumber(data.overview.totalCheckins)}
            icon={<UserCheck className="h-5 w-5" />}
            color="info"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Venues"
            value={formatNumber(data.overview.totalVenues)}
            icon={<Building2 className="h-5 w-5" />}
            color="warning"
            size="sm"
          />
          <StatCard
            title="Organizers"
            value={formatNumber(data.overview.totalOrganizers)}
            icon={<Briefcase className="h-5 w-5" />}
            color="muted"
            size="sm"
          />
          <StatCard
            title="Promoters"
            value={formatNumber(data.overview.totalPromoters)}
            icon={<Megaphone className="h-5 w-5" />}
            color="danger"
            size="sm"
          />
          <StatCard
            title="DJs"
            value={formatNumber(data.overview.totalDJs)}
            icon={<Radio className="h-5 w-5" />}
            color="secondary"
            size="sm"
          />
          <StatCard
            title="Platform Users"
            value={formatNumber(data.overview.totalUsers)}
            icon={<Users className="h-5 w-5" />}
            color="muted"
            size="sm"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Registrations Trend (30 days) */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Registrations (Last 30 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.registrationsTrend}>
                  <defs>
                    <linearGradient id="registrationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1D24",
                      border: "1px solid #2A2F3A",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={formatDate}
                    formatter={(value: number) => [value, "Registrations"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#registrationGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Monthly Registrations (12 Months)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1D24",
                      border: "1px solid #2A2F3A",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={formatMonth}
                    formatter={(value: number) => [value, "Registrations"]}
                  />
                  <Bar
                    dataKey="count"
                    fill={COLORS.secondary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Role Distribution */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              User Role Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.roleDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="role"
                  >
                    {data.roleDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1D24",
                      border: "1px solid #2A2F3A",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Events by Status */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Events by Status
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.eventsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                  >
                    {data.eventsByStatus.map((entry) => (
                      <Cell
                        key={`cell-${entry.status}`}
                        fill={STATUS_COLORS[entry.status] || COLORS.muted}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A1D24",
                      border: "1px solid #2A2F3A",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Check-in Rate */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Check-in Rate
            </h3>
            <div className="h-64 flex flex-col items-center justify-center">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#2A2F3A"
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={COLORS.success}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${(data.overview.totalCheckins / data.overview.totalRegistrations) * 251.2} 251.2`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {data.overview.totalRegistrations > 0
                      ? Math.round((data.overview.totalCheckins / data.overview.totalRegistrations) * 100)
                      : 0}%
                  </span>
                  <span className="text-xs text-secondary">Checked In</span>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-secondary">
                {formatNumber(data.overview.totalCheckins)} of {formatNumber(data.overview.totalRegistrations)} registrations
              </div>
            </div>
          </Card>
        </div>

        {/* Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Events */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Top Events by Registrations
            </h3>
            <div className="space-y-1">
              {data.topEvents.length === 0 ? (
                <p className="text-sm text-secondary">No events yet</p>
              ) : (
                data.topEvents.map((event, index) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-raised transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-secondary/10 text-xs font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm text-primary truncate max-w-[150px] group-hover:text-primary transition-colors">
                        {event.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatNumber(event.registrations)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Top Promoters */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Top Promoters by Referrals
            </h3>
            <div className="space-y-1">
              {data.topPromoters.length === 0 ? (
                <p className="text-sm text-secondary">No promoters yet</p>
              ) : (
                data.topPromoters.map((promoter, index) => (
                  <Link
                    key={promoter.id}
                    href={`/admin/promoters?highlight=${promoter.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-raised transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/10 text-xs font-medium text-secondary">
                        {index + 1}
                      </span>
                      <span className="text-sm text-primary truncate max-w-[150px] group-hover:text-secondary transition-colors">
                        {promoter.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatNumber(promoter.referrals)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Top Organizers */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Top Organizers by Events
            </h3>
            <div className="space-y-1">
              {data.topOrganizers.length === 0 ? (
                <p className="text-sm text-secondary">No organizers yet</p>
              ) : (
                data.topOrganizers.map((organizer, index) => (
                  <Link
                    key={organizer.id}
                    href={`/admin/organizers?highlight=${organizer.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-raised transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-xs font-medium text-warning">
                        {index + 1}
                      </span>
                      <span className="text-sm text-primary truncate max-w-[150px] group-hover:text-warning transition-colors">
                        {organizer.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatNumber(organizer.eventCount)} events
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Top DJs */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Top DJs by Events
            </h3>
            <div className="space-y-1">
              {data.topDJs && data.topDJs.length === 0 ? (
                <p className="text-sm text-secondary">No DJs yet</p>
              ) : (
                (data.topDJs || []).map((dj, index) => (
                  <Link
                    key={dj.id}
                    href={`/admin/djs/${dj.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-raised transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-xs font-medium text-purple-500">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {dj.profileImageUrl ? (
                          <img
                            src={dj.profileImageUrl}
                            alt={dj.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Radio className="w-3 h-3 text-purple-500" />
                          </div>
                        )}
                        <span className="text-sm text-primary truncate max-w-[120px] group-hover:text-purple-500 transition-colors">
                          {dj.name}
                        </span>
                        {dj.verified && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-medium">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatNumber(dj.eventCount)} events
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Top Referrers (All Users) */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">
              Top Referrers (All Users)
            </h3>
            <div className="space-y-1">
              {data.topReferrers && data.topReferrers.length === 0 ? (
                <p className="text-sm text-secondary">No referrals yet</p>
              ) : (
                (data.topReferrers || []).map((referrer, index) => (
                  <Link
                    key={referrer.userId}
                    href={`/admin/users?highlight=${referrer.userId}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-border last:border-0 hover:bg-raised transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10 text-xs font-medium text-info">
                        {index + 1}
                      </span>
                      <span className="text-sm text-primary truncate max-w-[150px] group-hover:text-info transition-colors">
                        {referrer.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-secondary">
                      {formatNumber(referrer.referrals)} referrals
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  size = "lg",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: keyof typeof COLORS;
  trend?: number;
  size?: "sm" | "lg";
}) {
  const colorClass = {
    primary: "bg-accent-secondary/10 text-primary",
    secondary: "bg-purple-500/10 text-purple-500",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-cyan-500/10 text-cyan-500",
    muted: "bg-foreground-muted/10 text-secondary",
  }[color];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className={`font-bold text-primary ${size === "lg" ? "text-2xl" : "text-xl"}`}>
          {value}
        </p>
        <p className="text-xs text-secondary">{title}</p>
      </div>
    </Card>
  );
}

