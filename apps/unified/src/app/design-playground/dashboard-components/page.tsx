"use client";

/**
 * DESIGN PLAYGROUND - DASHBOARD COMPONENTS
 * 
 * Stat cards, navigation, leaderboards, and metrics for dashboards.
 * Route: /design-playground/dashboard-components
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 * 
 * ============================================
 * COMPONENTS INCLUDED
 * ============================================
 * 
 * 1. STAT CARDS - Large metrics with labels and trends
 * 2. SIDEBAR NAVIGATION - Icon-based with active states
 * 3. LEADERBOARD - Ranked promoter/attendee lists
 * 4. EVENT LIST ROWS - Compact event displays with stats
 * 5. PROGRESS BARS - Capacity, audience metrics
 * 6. COUNTDOWN TIMER - Time to doors
 * 7. TREND INDICATORS - Period comparisons
 * 8. VELOCITY CHARTS - Bar chart placeholders
 * 
 * ============================================
 */

import { useState, useEffect } from "react";
import { Card, Badge, Button, VipBadge, VipStatus } from "@crowdstack/ui";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Settings,
  Calendar,
  TrendingUp,
  TrendingDown,
  Eye,
  UserPlus,
  CheckCircle2,
  Clock,
  Trophy,
  ChevronRight,
  Download,
  Plus,
  BarChart3,
  Target,
  Zap,
  Star,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import Image from "next/image";

// ============================================
// HELPER COMPONENTS
// ============================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="section-header">{title}</h2>
      {subtitle && <p className="text-sm text-secondary mt-1">{subtitle}</p>}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-3">
      {children}
    </p>
  );
}

// ============================================
// STAT CARD COMPONENTS
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  icon?: React.ReactNode;
  accent?: "default" | "primary" | "success" | "warning" | "error";
  size?: "default" | "compact";
}

function StatCard({ label, value, subLabel, trend, icon, accent = "default", size = "default" }: StatCardProps) {
  const accentColors = {
    default: "border-border-subtle",
    primary: "border-accent-primary/30 bg-accent-primary/5",
    success: "border-accent-success/30 bg-accent-success/5",
    warning: "border-accent-warning/30 bg-accent-warning/5",
    error: "border-accent-error/30 bg-accent-error/5",
  };

  const trendColors = {
    up: "text-accent-success",
    down: "text-accent-error",
    neutral: "text-secondary",
  };

  // Compact layout - optimized for tight grids
  if (size === "compact") {
    return (
      <Card className={`${accentColors[accent]} !p-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="font-sans text-xl font-bold tracking-tight text-primary">
                {value}
              </p>
              {trend && (
                <div className={`flex items-center gap-0.5 ${trendColors[trend.direction]}`}>
                  {trend.direction === "up" && <TrendingUp className="h-2.5 w-2.5" />}
                  {trend.direction === "down" && <TrendingDown className="h-2.5 w-2.5" />}
                  <span className="text-[10px] font-semibold">{trend.value}</span>
                </div>
              )}
            </div>
            {subLabel && (
              <p className="text-[10px] text-secondary mt-0.5 truncate">{subLabel}</p>
            )}
          </div>
          {icon && (
            <div className="text-muted flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default layout
  return (
    <Card className={accentColors[accent]}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
            {label}
          </p>
          <p className="font-sans text-4xl font-bold tracking-tight text-primary mt-2">
            {value}
          </p>
          {subLabel && (
            <p className="text-sm text-accent-secondary mt-1">{subLabel}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${trendColors[trend.direction]}`}>
              {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
              <span className="text-xs font-medium">{trend.value}</span>
              {trend.label && <span className="text-xs text-muted">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-muted">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================
// SIDEBAR NAVIGATION
// ============================================

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string | number;
  onClick?: () => void;
}

function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? "bg-active text-primary border border-border-subtle"
          : "text-secondary hover:text-primary hover:bg-glass"
      }`}
    >
      <span className={active ? "text-accent-primary" : ""}>{icon}</span>
      <span className="font-medium text-sm">{label}</span>
      {badge && (
        <Badge color="purple" variant="solid" className="ml-auto !text-[9px]">
          {badge}
        </Badge>
      )}
    </button>
  );
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  isLive?: boolean;
  items: Array<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    badge?: string | number;
  }>;
}

function Sidebar({ title, subtitle, isLive, items }: SidebarProps) {
  return (
    <div className="w-64 bg-void border-r border-border-subtle p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-glass rounded-xl border border-border-subtle">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLive ? "bg-accent-error/20" : "bg-accent-primary/20"}`}>
          {isLive ? (
            <Radio className="h-5 w-5 text-accent-error" />
          ) : (
            <Calendar className="h-5 w-5 text-accent-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
          {isLive && (
            <Badge color="red" variant="solid" className="mt-1 !text-[8px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {items.map((item, i) => (
          <NavItem key={i} {...item} />
        ))}
      </nav>
    </div>
  );
}

// ============================================
// LEADERBOARD
// ============================================

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  primaryStat: string | number;
  primaryLabel: string;
  secondaryStat?: string;
  secondaryLabel?: string;
}

interface LeaderboardProps {
  title: string;
  entries: LeaderboardEntry[];
  onViewAll?: () => void;
}

function Leaderboard({ title, entries, onViewAll }: LeaderboardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "bg-accent-warning text-void";
    if (rank === 2) return "bg-muted/30 text-primary";
    if (rank === 3) return "bg-orange-900/50 text-orange-400";
    return "bg-glass text-secondary";
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent-warning" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
            {title}
          </h3>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" className="!text-xs">
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-glass transition-colors"
          >
            {/* Rank */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${getRankColor(entry.rank)}`}>
              {entry.rank}
            </div>

            {/* Avatar */}
            {entry.avatar ? (
              <Image
                src={entry.avatar}
                alt={entry.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {entry.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-primary truncate">{entry.name}</p>
            </div>

            {/* Stats */}
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{entry.primaryStat} <span className="text-xs font-normal text-secondary">{entry.primaryLabel}</span></p>
              {entry.secondaryStat && (
                <p className="text-xs text-accent-success">+{entry.secondaryStat} {entry.secondaryLabel}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {onViewAll && (
        <Button variant="secondary" size="sm" className="w-full mt-4">
          Manage Promoters
        </Button>
      )}
    </Card>
  );
}

// ============================================
// EVENT LIST ROW
// ============================================

interface EventListRowProps {
  name: string;
  date: string;
  flierUrl?: string;
  rsvps: number;
  capacityPercent: number;
  onClick?: () => void;
}

function EventListRow({ name, date, flierUrl, rsvps, capacityPercent, onClick }: EventListRowProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-3 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/30 hover:bg-active/50 transition-all cursor-pointer group"
    >
      {/* Flier Thumbnail */}
      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
        {flierUrl ? (
          <Image
            src={flierUrl}
            alt={name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-6 w-6 text-muted" />
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-primary truncate group-hover:text-accent-secondary transition-colors">
          {name}
        </p>
        <p className="text-xs text-muted mt-0.5">{date}</p>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-primary">{rsvps.toLocaleString()}</p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted">RSVPs</p>
      </div>

      {/* Capacity */}
      <div className="text-right flex-shrink-0 min-w-[60px]">
        <p className={`text-lg font-bold ${capacityPercent >= 90 ? "text-accent-error" : capacityPercent >= 70 ? "text-accent-warning" : "text-accent-success"}`}>
          {capacityPercent}%
        </p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted">Cap</p>
      </div>
    </div>
  );
}

// ============================================
// PROGRESS METRIC
// ============================================

interface ProgressMetricProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md";
}

function ProgressMetric({ label, value, maxValue = 100, color = "primary", size = "md" }: ProgressMetricProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const colorClasses = {
    primary: "bg-accent-primary",
    success: "bg-accent-success",
    warning: "bg-accent-warning",
    error: "bg-accent-error",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-secondary ${size === "sm" ? "text-xs" : "text-sm"}`}>{label}</span>
        <span className={`font-bold text-primary ${size === "sm" ? "text-sm" : "text-base"}`}>{value}%</span>
      </div>
      <div className={`w-full bg-raised rounded-full overflow-hidden ${size === "sm" ? "h-1.5" : "h-2"}`}>
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// COUNTDOWN TIMER
// ============================================

interface CountdownTimerProps {
  label: string;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownTimer({ label, hours, minutes, seconds }: CountdownTimerProps) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
        {label}
      </p>
      <p className="font-mono text-3xl font-bold text-primary tracking-tight">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </p>
    </div>
  );
}

// ============================================
// VELOCITY CHART (Placeholder)
// ============================================

function VelocityChart() {
  // Generate mock bar data
  const bars = Array.from({ length: 24 }, (_, i) => {
    const baseHeight = 20 + Math.random() * 30;
    const peak = i >= 16 && i <= 22;
    return peak ? baseHeight + 30 + Math.random() * 30 : baseHeight;
  });

  return (
    <Card>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-4 w-4 text-accent-secondary" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
          RSVP Velocity (24H)
        </h3>
      </div>

      <div className="flex items-end justify-between gap-1 h-32">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-accent-primary/80 rounded-t transition-all hover:bg-accent-primary"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between mt-2 text-[10px] font-mono text-muted">
        <span>00:00</span>
        <span>12:00</span>
        <span>Now</span>
      </div>
    </Card>
  );
}

// ============================================
// AUDIENCE CARD
// ============================================

function AudienceCard() {
  return (
    <Card>
      <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary mb-4">
        Audience
      </h3>

      <div className="space-y-4">
        <ProgressMetric label="Returning Visitors" value={64} color="primary" />
        <ProgressMetric label="VIP Members" value={12} color="warning" />
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-subtle">
        <div className="w-8 h-8 rounded-full bg-accent-success/20 flex items-center justify-center">
          <span className="text-xs font-bold text-accent-success">+2k</span>
        </div>
        <p className="text-sm text-secondary">New profiles added this month</p>
      </div>

      <Button variant="secondary" size="sm" className="w-full mt-4">
        View Database
      </Button>
    </Card>
  );
}

// ============================================
// PAGE HEADER
// ============================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  isLive?: boolean;
  date?: string;
  actions?: React.ReactNode;
  countdown?: {
    label: string;
    hours: number;
    minutes: number;
    seconds: number;
  };
}

function PageHeader({ title, subtitle, isLive, date, actions, countdown }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">
            {title}
          </h1>
          {isLive && (
            <Badge color="red" variant="solid">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
        {subtitle && <p className="text-secondary">{subtitle}</p>}
        {date && <p className="text-secondary">{date}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        {countdown && <CountdownTimer {...countdown} />}
      </div>
    </div>
  );
}

// ============================================
// SKELETON COMPONENTS
// ============================================

function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-3 w-24 bg-glass rounded mb-3" />
      <div className="h-10 w-32 bg-glass rounded mb-2" />
      <div className="h-4 w-20 bg-glass rounded" />
    </Card>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 bg-glass rounded" />
        <div className="h-4 w-24 bg-glass rounded" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <div className="w-7 h-7 rounded-full bg-glass" />
          <div className="w-8 h-8 rounded-full bg-glass" />
          <div className="flex-1 h-4 bg-glass rounded" />
          <div className="w-16 h-4 bg-glass rounded" />
        </div>
      ))}
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DashboardComponentsPage() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [time, setTime] = useState({ hours: 8, minutes: 42, seconds: 12 });

  // Simulate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { icon: <LayoutDashboard className="h-4 w-4" />, label: "Dashboard", active: activeNav === "dashboard" },
    { icon: <Users className="h-4 w-4" />, label: "Guestlist", badge: "1.2k" },
    { icon: <Megaphone className="h-4 w-4" />, label: "Promoters" },
    { icon: <Settings className="h-4 w-4" />, label: "Settings" },
  ];

  const leaderboardEntries = [
    { rank: 1, name: "Sarah J.", primaryStat: 142, primaryLabel: "Signups", secondaryStat: "42", secondaryLabel: "New" },
    { rank: 2, name: "Mike T.", primaryStat: 89, primaryLabel: "Signups", secondaryStat: "12", secondaryLabel: "New" },
    { rank: 3, name: "Jessica L.", primaryStat: 64, primaryLabel: "Signups", secondaryStat: "8", secondaryLabel: "New" },
    { rank: 4, name: "Davide B.", primaryStat: 47, primaryLabel: "Signups", secondaryStat: "5", secondaryLabel: "New" },
  ];

  const topEvents = [
    { name: "Neon Horizon v1.0", date: "Oct 21", flierUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop", rsvps: 1245, capacityPercent: 98 },
    { name: "Neon Horizon v2.0", date: "Oct 22", flierUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop", rsvps: 1245, capacityPercent: 98 },
    { name: "Neon Horizon v3.0", date: "Oct 23", flierUrl: "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=100&h=100&fit=crop", rsvps: 1245, capacityPercent: 98 },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-void/95 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-sans text-3xl font-black text-primary uppercase tracking-tighter">
                Dashboard Components
              </h1>
              <p className="text-sm text-secondary">Stat cards, navigation, leaderboards, and metrics</p>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">

        {/* ============================================ */}
        {/* STAT CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Stat Cards" 
            subtitle="Large metrics with labels, sub-labels, and trend indicators"
          />

          <div className="mb-8">
            <CardLabel>Default Stats Row</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total RSVPs"
                value="1,240"
                subLabel="82% of Capacity"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Est. Check-ins"
                value="890"
                subLabel="~72% turnout"
                icon={<CheckCircle2 className="h-5 w-5" />}
                accent="success"
              />
              <StatCard
                label="Page Views"
                value="12.5k"
                subLabel="High Traffic"
                icon={<Eye className="h-5 w-5" />}
              />
              <StatCard
                label="Promoter Signups"
                value="342"
                subLabel="Top: Sarah J."
                icon={<UserPlus className="h-5 w-5" />}
              />
            </div>
          </div>

          <div className="mb-8">
            <CardLabel>With Trend Indicators</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total RSVPs"
                value="4,289"
                trend={{ value: "+8.4%", direction: "up", label: "vs last period" }}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                label="Check-in Rate"
                value="84%"
                trend={{ value: "+2.1%", direction: "up", label: "vs last period" }}
                icon={<Target className="h-5 w-5" />}
                accent="success"
              />
              <StatCard
                label="Follower Growth"
                value="+1,240"
                trend={{ value: "+12%", direction: "up", label: "vs last period" }}
                icon={<Zap className="h-5 w-5" />}
                accent="primary"
              />
              <StatCard
                label="New Signups"
                value="345"
                trend={{ value: "-1.2%", direction: "down", label: "vs last period" }}
                icon={<UserPlus className="h-5 w-5" />}
                accent="warning"
              />
            </div>
          </div>

          <div className="mb-8">
            <CardLabel>Compact Size (Basic)</CardLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="RSVPs" value="1,240" size="compact" />
              <StatCard label="Check-ins" value="890" size="compact" accent="success" />
              <StatCard label="Pending" value="156" size="compact" accent="warning" />
              <StatCard label="Rejected" value="12" size="compact" accent="error" />
              <StatCard label="Conv. %" value="72%" size="compact" />
              <StatCard label="Revenue" value="$4.2k" size="compact" accent="primary" />
            </div>
          </div>

          <div className="mb-8">
            <CardLabel>Compact Size (With Trends)</CardLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard 
                label="RSVPs" 
                value="1,240" 
                size="compact" 
                trend={{ value: "+12%", direction: "up" }}
              />
              <StatCard 
                label="Check-ins" 
                value="890" 
                size="compact" 
                accent="success"
                trend={{ value: "+8%", direction: "up" }}
              />
              <StatCard 
                label="Pending" 
                value="156" 
                size="compact" 
                accent="warning"
                trend={{ value: "-3%", direction: "down" }}
              />
              <StatCard 
                label="Rejected" 
                value="12" 
                size="compact" 
                accent="error"
                trend={{ value: "+2", direction: "up" }}
              />
              <StatCard 
                label="Conv. %" 
                value="72%" 
                size="compact"
                trend={{ value: "+5%", direction: "up" }}
              />
              <StatCard 
                label="Revenue" 
                value="$4.2k" 
                size="compact" 
                accent="primary"
                trend={{ value: "+18%", direction: "up" }}
              />
            </div>
          </div>

          <div className="mb-8">
            <CardLabel>Compact Size (With Icons & Sub-labels)</CardLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard 
                label="Total RSVPs" 
                value="1,240" 
                size="compact"
                subLabel="82% capacity"
                icon={<Users className="h-4 w-4" />}
                trend={{ value: "+12%", direction: "up" }}
              />
              <StatCard 
                label="Checked In" 
                value="890" 
                size="compact" 
                accent="success"
                subLabel="72% turnout"
                icon={<CheckCircle2 className="h-4 w-4" />}
                trend={{ value: "+8%", direction: "up" }}
              />
              <StatCard 
                label="Page Views" 
                value="12.5k" 
                size="compact"
                subLabel="Last 24h"
                icon={<Eye className="h-4 w-4" />}
                trend={{ value: "+24%", direction: "up" }}
              />
              <StatCard 
                label="Signups" 
                value="342" 
                size="compact" 
                accent="primary"
                subLabel="Via promoters"
                icon={<UserPlus className="h-4 w-4" />}
                trend={{ value: "+15%", direction: "up" }}
              />
              <StatCard 
                label="No Shows" 
                value="48" 
                size="compact" 
                accent="error"
                subLabel="3.9% rate"
                icon={<Target className="h-4 w-4" />}
                trend={{ value: "-2%", direction: "down" }}
              />
              <StatCard 
                label="Earnings" 
                value="$2.4k" 
                size="compact" 
                accent="success"
                subLabel="This event"
                icon={<Zap className="h-4 w-4" />}
                trend={{ value: "+$320", direction: "up" }}
              />
            </div>
          </div>

          <div className="mb-8">
            <CardLabel>Loading State</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* SIDEBAR NAVIGATION */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Sidebar Navigation" 
            subtitle="Icon-based navigation with active states and badges"
          />

          <div className="mb-8">
            <CardLabel>Event Dashboard Sidebar</CardLabel>
            <div className="flex gap-8">
              <Sidebar
                title="Neon Horizon"
                isLive
                items={navItems}
              />
              <Sidebar
                title="The Warehouse"
                subtitle="Business Account"
                items={[
                  { icon: <LayoutDashboard className="h-4 w-4" />, label: "Mission Control", active: true },
                  { icon: <Calendar className="h-4 w-4" />, label: "Events", badge: 12 },
                  { icon: <Users className="h-4 w-4" />, label: "Audience" },
                  { icon: <Megaphone className="h-4 w-4" />, label: "Promoters" },
                  { icon: <Settings className="h-4 w-4" />, label: "Settings" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* PAGE HEADERS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Page Headers" 
            subtitle="Dashboard headers with titles, badges, actions, and countdowns"
          />

          <div className="mb-8 space-y-8">
            <CardLabel>Event Dashboard Header (Live)</CardLabel>
            <div className="p-6 bg-glass rounded-xl border border-border-subtle">
              <PageHeader
                title="Event Dashboard"
                date="The Warehouse • Oct 24, 2023"
                isLive
                countdown={{ label: "Time to Doors", ...time }}
              />
            </div>

            <CardLabel>Mission Control Header</CardLabel>
            <div className="p-6 bg-glass rounded-xl border border-border-subtle">
              <PageHeader
                title="Mission Control"
                subtitle="Real-time operational overview."
                actions={
                  <div className="flex items-center gap-3">
                    <Button variant="secondary">
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                    <Button variant="primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* LEADERBOARD */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Leaderboard" 
            subtitle="Ranked lists for promoters, attendees, or events"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <CardLabel>Promoter Leaderboard</CardLabel>
              <Leaderboard
                title="Leaderboard"
                entries={leaderboardEntries}
                onViewAll={() => {}}
              />
            </div>
            <div>
              <CardLabel>Loading State</CardLabel>
              <LeaderboardSkeleton />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* EVENT LIST */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Event List Rows" 
            subtitle="Compact event displays with stats and capacity"
          />

          <div className="mb-8">
            <CardLabel>Top Performing Events</CardLabel>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  Top Performing Events
                </h3>
                <Button variant="ghost" size="sm" className="!text-xs text-accent-secondary">
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {topEvents.map((event, i) => (
                  <EventListRow key={i} {...event} />
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* CHARTS & METRICS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Charts & Metrics" 
            subtitle="Velocity charts, progress bars, and audience metrics"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CardLabel>Velocity Chart</CardLabel>
              <VelocityChart />
            </div>
            <div>
              <CardLabel>Audience Metrics</CardLabel>
              <AudienceCard />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* PROGRESS METRICS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Progress Metrics" 
            subtitle="Progress bars for capacity, audience, and completion"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Default Size
              </h4>
              <div className="space-y-4">
                <ProgressMetric label="Capacity" value={82} color="success" />
                <ProgressMetric label="Check-in Rate" value={72} color="primary" />
                <ProgressMetric label="VIP Members" value={12} color="warning" />
                <ProgressMetric label="At Risk" value={8} color="error" />
              </div>
            </Card>
            <Card>
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
                Small Size
              </h4>
              <div className="space-y-3">
                <ProgressMetric label="Capacity" value={82} color="success" size="sm" />
                <ProgressMetric label="Check-in Rate" value={72} color="primary" size="sm" />
                <ProgressMetric label="VIP Members" value={12} color="warning" size="sm" />
                <ProgressMetric label="At Risk" value={8} color="error" size="sm" />
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* COUNTDOWN TIMER */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Countdown Timer" 
            subtitle="Live countdown display for events"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CountdownTimer label="Time to Doors" {...time} />
            </Card>
            <Card className="text-center">
              <CountdownTimer label="Event Starts In" hours={2} minutes={15} seconds={30} />
            </Card>
            <Card className="text-center">
              <CountdownTimer label="Registration Closes" hours={0} minutes={45} seconds={22} />
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* VIP BADGES */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="VIP Badges" 
            subtitle="Status indicators for Global, Venue, and Organizer VIPs"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Badge Variants */}
            <Card>
              <CardLabel>VIP Badge Variants</CardLabel>
              
              <div className="space-y-6">
                {/* Badge variant */}
                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Badge (Default)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" variant="badge" />
                    <VipBadge level="venue" variant="badge" />
                    <VipBadge level="organizer" variant="badge" />
                  </div>
                </div>

                {/* Pill variant */}
                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Pill (Solid)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" variant="pill" />
                    <VipBadge level="venue" variant="pill" />
                    <VipBadge level="organizer" variant="pill" />
                  </div>
                </div>

                {/* Icon variant */}
                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Icon Only</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" variant="icon" />
                    <VipBadge level="venue" variant="icon" />
                    <VipBadge level="organizer" variant="icon" />
                  </div>
                </div>

                {/* Label variant */}
                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Label (No Border)</p>
                  <div className="flex items-center gap-6">
                    <VipBadge level="global" variant="label" />
                    <VipBadge level="venue" variant="label" />
                    <VipBadge level="organizer" variant="label" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Sizes */}
            <Card>
              <CardLabel>VIP Badge Sizes</CardLabel>
              
              <div className="space-y-6">
                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Extra Small (XS)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" size="xs" />
                    <VipBadge level="venue" size="xs" />
                    <VipBadge level="organizer" size="xs" />
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Small (SM - Default)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" size="sm" />
                    <VipBadge level="venue" size="sm" />
                    <VipBadge level="organizer" size="sm" />
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Medium (MD)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" size="md" />
                    <VipBadge level="venue" size="md" />
                    <VipBadge level="organizer" size="md" />
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[9px] text-secondary uppercase mb-2">Large (LG)</p>
                  <div className="flex items-center gap-3">
                    <VipBadge level="global" size="lg" />
                    <VipBadge level="venue" size="lg" />
                    <VipBadge level="organizer" size="lg" />
                  </div>
                </div>
              </div>
            </Card>

            {/* In Context - Attendee Row */}
            <Card className="md:col-span-2">
              <CardLabel>VIP Badges in Context</CardLabel>
              
              <div className="space-y-4">
                {/* Attendee List Example */}
                <div className="border border-border-subtle rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-surface-elevated border-b border-border-subtle">
                    <p className="font-mono text-[9px] text-secondary uppercase">Attendee List Preview</p>
                  </div>
                  
                  {[
                    { name: "Sarah Johnson", email: "sarah@example.com", isGlobal: true, isVenue: false, isOrg: false },
                    { name: "Mike Thompson", email: "mike@example.com", isGlobal: false, isVenue: true, isOrg: false },
                    { name: "Jessica Lee", email: "jess@example.com", isGlobal: false, isVenue: false, isOrg: true },
                    { name: "Davide Brooks", email: "david@example.com", isGlobal: true, isVenue: true, isOrg: false },
                    { name: "Regular Guest", email: "guest@example.com", isGlobal: false, isVenue: false, isOrg: false },
                  ].map((attendee, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-elevated/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-sm font-bold text-accent-primary">
                          {attendee.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-primary">{attendee.name}</span>
                            <VipStatus 
                              isGlobalVip={attendee.isGlobal} 
                              isVenueVip={attendee.isVenue} 
                              isOrganizerVip={attendee.isOrg}
                              showHighestOnly={false}
                              size="xs"
                            />
                          </div>
                          <span className="text-sm text-secondary">{attendee.email}</span>
                        </div>
                      </div>
                      <Badge color="green" variant="outline">Checked In</Badge>
                    </div>
                  ))}
                </div>

                {/* Profile Card Example */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="!bg-surface-elevated">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-lg font-bold text-void">
                        SJ
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">Sarah Johnson</span>
                          <VipBadge level="global" size="sm" />
                        </div>
                        <span className="text-sm text-secondary">Platinum Member</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-primary">42</div>
                        <div className="text-[10px] text-secondary">Events</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-success">98%</div>
                        <div className="text-[10px] text-secondary">Attendance</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-primary">Lv 42</div>
                        <div className="text-[10px] text-secondary">XP Level</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="!bg-surface-elevated">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-full bg-accent-primary/30 flex items-center justify-center text-lg font-bold text-accent-primary">
                        MT
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">Mike Thompson</span>
                          <VipBadge level="venue" size="sm" scopeName="The Warehouse" />
                        </div>
                        <span className="text-sm text-secondary">Venue Regular</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-primary">18</div>
                        <div className="text-[10px] text-secondary">Events</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-success">100%</div>
                        <div className="text-[10px] text-secondary">Attendance</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-primary">Lv 28</div>
                        <div className="text-[10px] text-secondary">XP Level</div>
                      </div>
                    </div>
                  </Card>

                  <Card className="!bg-surface-elevated">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-14 w-14 rounded-full bg-accent-secondary/30 flex items-center justify-center text-lg font-bold text-accent-secondary">
                        JL
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">Jessica Lee</span>
                          <VipBadge level="organizer" size="sm" scopeName="Neon Events" />
                        </div>
                        <span className="text-sm text-secondary">Organizer Fan</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-primary">12</div>
                        <div className="text-[10px] text-secondary">Events</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-success">92%</div>
                        <div className="text-[10px] text-secondary">Attendance</div>
                      </div>
                      <div className="p-2 rounded bg-surface">
                        <div className="text-lg font-bold text-accent-primary">Lv 15</div>
                        <div className="text-[10px] text-secondary">XP Level</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}

