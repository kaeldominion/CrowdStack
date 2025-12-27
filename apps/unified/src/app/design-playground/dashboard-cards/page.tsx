"use client";

/**
 * DESIGN PLAYGROUND - DASHBOARD EVENT CARDS
 * 
 * Comprehensive card designs for organizer/venue/promoter dashboards.
 * Route: /design-playground/dashboard-cards
 * 
 * ⚠️  DO NOT LINK IN PRODUCTION NAV
 * 
 * ============================================
 * CARD VARIANTS
 * ============================================
 * 
 * 1. FULL CARD (Portrait)
 *    - For live/upcoming events on dashboards
 *    - Full flier image, all stats, status badges
 *    - Used in grid layouts (3 columns desktop, 1-2 mobile)
 * 
 * 2. ROW CARD (Horizontal)
 *    - For event history/past events
 *    - Compact horizontal layout with thumbnail
 *    - Stats in columns on right side
 * 
 * 3. COMPACT CARD
 *    - For tight grids or mobile views
 *    - Essential info only, smaller footprint
 * 
 * ============================================
 * ROLE VARIANTS
 * ============================================
 * 
 * - ORGANIZER: Shows registrations, check-ins, conversion %, venue approval status
 * - VENUE: Shows organizer info, approval actions, registrations
 * - PROMOTER: Shows referrals, check-ins, commission, referral link
 * 
 * ============================================
 */

import { useState } from "react";
import { Card, Badge, Button } from "@crowdstack/ui";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  ArrowUpRight,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  Star,
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  Ticket,
  UserCheck,
  Building2,
  Megaphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface DashboardEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  flier_url: string | null;
  venue: { id: string; name: string; city: string; slug: string; } | null;
  organizer: { id: string; name: string; avatar_url: string | null; };
  registrations: number;
  checkins: number;
  capacity: number;
  referral_link: string | null;
  promoter_registrations: number;
  promoter_checkins: number;
  commission_earned: number;
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_EVENTS: Record<string, DashboardEvent> = {
  live: {
    id: "event-live-1",
    name: "Saturday Night Sessions",
    slug: "saturday-night-sessions",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: "published",
    venue_approval_status: "approved",
    flier_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=900&fit=crop",
    venue: { id: "v1", name: "Jade by Todd English", city: "Dubai", slug: "jade" },
    organizer: { id: "o1", name: "NightLife Events", avatar_url: null },
    registrations: 342,
    checkins: 287,
    capacity: 500,
    referral_link: "https://crowdstack.app/e/saturday?ref=abc123",
    promoter_registrations: 48,
    promoter_checkins: 41,
    commission_earned: 205,
  },
  upcoming: {
    id: "event-upcoming-1",
    name: "Friday Night Fever",
    slug: "friday-night-fever",
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: null,
    status: "published",
    venue_approval_status: "approved",
    flier_url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=900&fit=crop",
    venue: { id: "v1", name: "Jade by Todd English", city: "Dubai", slug: "jade" },
    organizer: { id: "o1", name: "NightLife Events", avatar_url: null },
    registrations: 156,
    checkins: 0,
    capacity: 400,
    referral_link: "https://crowdstack.app/e/friday?ref=abc123",
    promoter_registrations: 23,
    promoter_checkins: 0,
    commission_earned: 0,
  },
  pending: {
    id: "event-pending-1",
    name: "Underground Sessions",
    slug: "underground-sessions",
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: null,
    status: "draft",
    venue_approval_status: "pending",
    flier_url: "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=600&h=900&fit=crop",
    venue: { id: "v2", name: "Warehouse 42", city: "Dubai", slug: "warehouse-42" },
    organizer: { id: "o1", name: "NightLife Events", avatar_url: null },
    registrations: 0,
    checkins: 0,
    capacity: 200,
    referral_link: null,
    promoter_registrations: 0,
    promoter_checkins: 0,
    commission_earned: 0,
  },
  past: {
    id: "event-past-1",
    name: "New Year's Eve Extravaganza",
    slug: "new-years-eve",
    start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
    status: "ended",
    venue_approval_status: "approved",
    flier_url: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=600&h=900&fit=crop",
    venue: { id: "v1", name: "Jade by Todd English", city: "Dubai", slug: "jade" },
    organizer: { id: "o1", name: "NightLife Events", avatar_url: null },
    registrations: 487,
    checkins: 412,
    capacity: 500,
    referral_link: null,
    promoter_registrations: 67,
    promoter_checkins: 58,
    commission_earned: 290,
  },
  noImage: {
    id: "event-noimg-1",
    name: "Private Launch Party",
    slug: "private-launch",
    start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: null,
    status: "draft",
    venue_approval_status: "not_required",
    flier_url: null,
    venue: null,
    organizer: { id: "o1", name: "NightLife Events", avatar_url: null },
    registrations: 24,
    checkins: 0,
    capacity: 100,
    referral_link: "https://crowdstack.app/e/private?ref=abc123",
    promoter_registrations: 5,
    promoter_checkins: 0,
    commission_earned: 0,
  },
};

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

function RoleBadge({ role }: { role: "organizer" | "venue" | "promoter" }) {
  const config = {
    organizer: { icon: Megaphone, color: "purple", label: "Organizer View" },
    venue: { icon: Building2, color: "blue", label: "Venue View" },
    promoter: { icon: Star, color: "green", label: "Promoter View" },
  };
  const { icon: Icon, color, label } = config[role];
  return (
    <Badge color={color as any} variant="solid" className="!text-[10px]">
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

// ============================================
// STAT COMPONENTS
// ============================================

interface StatBlockProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: "default" | "success" | "warning" | "error" | "accent";
  size?: "sm" | "md";
}

function StatBlock({ label, value, icon, color = "default", size = "md" }: StatBlockProps) {
  const colorClasses = {
    default: "text-primary",
    success: "text-accent-success",
    warning: "text-accent-warning",
    error: "text-accent-error",
    accent: "text-accent-secondary",
  };
  
  return (
    <div className={`text-center ${size === "sm" ? "min-w-[50px]" : "min-w-[70px]"}`}>
      <div className={`flex items-center justify-center gap-1 ${colorClasses[color]}`}>
        {icon}
        <span className={`font-bold ${size === "sm" ? "text-sm" : "text-lg"}`}>{value}</span>
      </div>
      <p className={`font-mono uppercase tracking-widest text-muted ${size === "sm" ? "text-[8px]" : "text-[10px]"}`}>
        {label}
      </p>
    </div>
  );
}

function ConversionBadge({ rate }: { rate: number }) {
  const color = rate >= 70 ? "text-accent-success" : rate >= 40 ? "text-accent-warning" : "text-secondary";
  return (
    <div className="flex items-center gap-1">
      <TrendingUp className={`h-3 w-3 ${color}`} />
      <span className={`text-sm font-bold ${color}`}>{rate}%</span>
    </div>
  );
}

function CapacityBar({ current, max }: { current: number; max: number }) {
  const percentage = Math.min((current / max) * 100, 100);
  const color = percentage >= 90 ? "bg-accent-error" : percentage >= 70 ? "bg-accent-warning" : "bg-accent-success";
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted uppercase tracking-wider">Capacity</span>
        <span className="text-secondary font-medium">{current}/{max}</span>
      </div>
      <div className="h-1.5 bg-raised rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

// ============================================
// FULL CARD COMPONENT (ORGANIZER)
// ============================================

interface DashboardEventCardFullProps {
  event: DashboardEvent;
  role: "organizer" | "venue" | "promoter";
  isLive?: boolean;
}

function DashboardEventCardFull({ event, role, isLive }: DashboardEventCardFullProps) {
  const [copied, setCopied] = useState(false);
  const startDate = new Date(event.start_time);
  const conversionRate = event.registrations > 0 ? Math.round((event.checkins / event.registrations) * 100) : 0;
  
  const copyLink = () => {
    if (event.referral_link) {
      navigator.clipboard.writeText(event.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = () => {
    if (isLive) return <Badge color="red" variant="solid" className="animate-pulse">● Live</Badge>;
    if (event.status === "draft") return <Badge color="slate" variant="outline">Draft</Badge>;
    if (event.status === "published") return <Badge color="green" variant="solid">Published</Badge>;
    if (event.status === "ended") return <Badge color="slate" variant="ghost">Ended</Badge>;
    return null;
  };

  const getApprovalBadge = () => {
    if (event.venue_approval_status === "pending") {
      return <Badge color="amber" variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pending Approval</Badge>;
    }
    if (event.venue_approval_status === "rejected") {
      return <Badge color="red" variant="outline">Rejected</Badge>;
    }
    return null;
  };

  return (
    <Card className="overflow-hidden group hover:border-accent-primary/40 transition-all cursor-pointer">
      {/* Hero Image */}
      <div className="relative h-48 w-full overflow-hidden">
        {event.flier_url ? (
          <Image
            src={event.flier_url}
            alt={event.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-void to-accent-secondary/10 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-muted" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
        
        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-error/90 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
            </div>
          </div>
        )}
        
        {/* Date Badge */}
        <div className="absolute top-3 left-3">
          <div className="px-2.5 py-1.5 rounded-lg bg-void/80 backdrop-blur-sm border border-border-subtle">
            <p className="text-[10px] font-bold text-accent-secondary uppercase tracking-wider">
              {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        
        {/* Event Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-primary line-clamp-2 group-hover:text-accent-secondary transition-colors">
            {event.name}
          </h3>
          {event.venue && (
            <div className="flex items-center gap-1.5 text-secondary mt-1">
              <MapPin className="h-3 w-3" />
              <span className="text-sm truncate">{event.venue.name}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge()}
          {getApprovalBadge()}
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center justify-between py-3 border-t border-b border-border-subtle">
          {role === "promoter" ? (
            <>
              <StatBlock label="Referrals" value={event.promoter_registrations} icon={<Users className="h-4 w-4 text-muted" />} />
              <StatBlock label="Check-ins" value={event.promoter_checkins} icon={<CheckCircle2 className="h-4 w-4 text-muted" />} color="success" />
              <StatBlock label="Earned" value={`$${event.commission_earned}`} icon={<DollarSign className="h-4 w-4 text-muted" />} color="accent" />
            </>
          ) : (
            <>
              <StatBlock label="Registered" value={event.registrations} icon={<Users className="h-4 w-4 text-muted" />} />
              <StatBlock label="Checked In" value={event.checkins} icon={<CheckCircle2 className="h-4 w-4 text-muted" />} color="success" />
              <div className="text-center min-w-[70px]">
                <ConversionBadge rate={conversionRate} />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Conv.</p>
              </div>
            </>
          )}
        </div>
        
        {/* Capacity Bar (for organizer/venue) */}
        {role !== "promoter" && event.capacity && (
          <CapacityBar current={event.registrations} max={event.capacity} />
        )}
        
        {/* Referral Link (for promoter) */}
        {role === "promoter" && event.referral_link && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-glass border border-border-subtle">
            <input
              type="text"
              value={event.referral_link}
              readOnly
              className="flex-1 bg-transparent text-xs font-mono text-secondary truncate"
            />
            <Button variant="ghost" size="sm" onClick={copyLink} className="h-7 w-7 p-0 flex-shrink-0">
              {copied ? <Check className="h-3 w-3 text-accent-success" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}
        
        {/* Action Row */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="flex-1">
            View Details
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
          {isLive && role !== "promoter" && (
            <Button variant="primary" size="sm">
              <Radio className="h-3 w-3 mr-1" />
              Live Mode
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// ROW CARD COMPONENT
// ============================================

interface DashboardEventCardRowProps {
  event: DashboardEvent;
  role: "organizer" | "venue" | "promoter";
}

function DashboardEventCardRow({ event, role }: DashboardEventCardRowProps) {
  const startDate = new Date(event.start_time);
  const conversionRate = event.registrations > 0 ? Math.round((event.checkins / event.registrations) * 100) : 0;
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/30 hover:bg-active/50 transition-all cursor-pointer group">
      {/* Thumbnail */}
      <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
        {event.flier_url ? (
          <Image
            src={event.flier_url}
            alt={event.name}
            width={64}
            height={80}
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
        <h4 className="font-semibold text-primary truncate group-hover:text-accent-secondary transition-colors">
          {event.name}
        </h4>
        <div className="flex items-center gap-3 mt-1 text-sm text-secondary">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted" />
            {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {event.venue && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 text-muted" />
              {event.venue.name}
            </span>
          )}
        </div>
      </div>
      
      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6">
        {role === "promoter" ? (
          <>
            <StatBlock label="Referrals" value={event.promoter_registrations} size="sm" />
            <StatBlock label="Check-ins" value={event.promoter_checkins} size="sm" color="success" />
            <StatBlock label="Earned" value={`$${event.commission_earned}`} size="sm" color="accent" />
          </>
        ) : (
          <>
            <StatBlock label="Registered" value={event.registrations} size="sm" />
            <StatBlock label="Checked In" value={event.checkins} size="sm" color="success" />
            <div className="text-center min-w-[50px]">
              <span className={`text-sm font-bold ${conversionRate >= 70 ? "text-accent-success" : conversionRate >= 40 ? "text-accent-warning" : "text-secondary"}`}>
                {conversionRate}%
              </span>
              <p className="font-mono text-[8px] uppercase tracking-widest text-muted">Conv.</p>
            </div>
          </>
        )}
      </div>
      
      {/* Arrow */}
      <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
    </div>
  );
}

// ============================================
// COMPACT CARD COMPONENT
// ============================================

interface DashboardEventCardCompactProps {
  event: DashboardEvent;
  role: "organizer" | "venue" | "promoter";
  isLive?: boolean;
}

function DashboardEventCardCompact({ event, role, isLive }: DashboardEventCardCompactProps) {
  const startDate = new Date(event.start_time);
  const conversionRate = event.registrations > 0 ? Math.round((event.checkins / event.registrations) * 100) : 0;
  
  return (
    <Card className="overflow-hidden group hover:border-accent-primary/40 transition-all cursor-pointer" padding="none">
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-24 h-32 flex-shrink-0 overflow-hidden">
          {event.flier_url ? (
            <Image
              src={event.flier_url}
              alt={event.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/10 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted" />
            </div>
          )}
          {isLive && (
            <div className="absolute top-2 left-2">
              <div className="h-2 w-2 rounded-full bg-accent-error animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-accent-secondary">
              {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
            <h4 className="font-semibold text-sm text-primary truncate mt-0.5 group-hover:text-accent-secondary transition-colors">
              {event.name}
            </h4>
            {event.venue && (
              <p className="text-xs text-muted truncate mt-0.5">{event.venue.name}</p>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2">
            {role === "promoter" ? (
              <>
                <span className="text-xs text-secondary">{event.promoter_registrations} refs</span>
                <span className="text-xs text-accent-success">{event.promoter_checkins} in</span>
              </>
            ) : (
              <>
                <span className="text-xs text-secondary">{event.registrations} reg</span>
                <span className="text-xs text-accent-success">{event.checkins} in</span>
                <span className={`text-xs font-medium ${conversionRate >= 70 ? "text-accent-success" : conversionRate >= 40 ? "text-accent-warning" : "text-secondary"}`}>
                  {conversionRate}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// SKELETON COMPONENTS
// ============================================

function FullCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <div className="h-48 bg-raised" />
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-glass rounded-full" />
          <div className="h-5 w-24 bg-glass rounded-full" />
        </div>
        <div className="flex justify-between py-3 border-t border-b border-border-subtle">
          <div className="text-center">
            <div className="h-6 w-12 bg-glass rounded mx-auto" />
            <div className="h-3 w-16 bg-glass rounded mt-1 mx-auto" />
          </div>
          <div className="text-center">
            <div className="h-6 w-12 bg-glass rounded mx-auto" />
            <div className="h-3 w-16 bg-glass rounded mt-1 mx-auto" />
          </div>
          <div className="text-center">
            <div className="h-6 w-12 bg-glass rounded mx-auto" />
            <div className="h-3 w-16 bg-glass rounded mt-1 mx-auto" />
          </div>
        </div>
        <div className="h-1.5 bg-glass rounded-full" />
        <div className="h-9 bg-glass rounded-lg" />
      </div>
    </Card>
  );
}

function RowCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle animate-pulse">
      <div className="w-16 h-20 bg-raised rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 bg-glass rounded" />
        <div className="h-4 w-1/2 bg-glass rounded" />
      </div>
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-center">
          <div className="h-5 w-10 bg-glass rounded mx-auto" />
          <div className="h-3 w-14 bg-glass rounded mt-1" />
        </div>
        <div className="text-center">
          <div className="h-5 w-10 bg-glass rounded mx-auto" />
          <div className="h-3 w-14 bg-glass rounded mt-1" />
        </div>
        <div className="text-center">
          <div className="h-5 w-10 bg-glass rounded mx-auto" />
          <div className="h-3 w-14 bg-glass rounded mt-1" />
        </div>
      </div>
    </div>
  );
}

function CompactCardSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden animate-pulse">
      <div className="flex">
        <div className="w-24 h-32 bg-raised" />
        <div className="flex-1 p-3 space-y-2">
          <div className="h-3 w-16 bg-glass rounded" />
          <div className="h-4 w-3/4 bg-glass rounded" />
          <div className="h-3 w-1/2 bg-glass rounded" />
          <div className="flex gap-2 mt-auto pt-2">
            <div className="h-3 w-12 bg-glass rounded" />
            <div className="h-3 w-12 bg-glass rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DashboardCardsPage() {
  const [selectedRole, setSelectedRole] = useState<"organizer" | "venue" | "promoter">("organizer");

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-void/95 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-sans text-3xl font-black text-primary uppercase tracking-tighter">
                Dashboard Cards
              </h1>
              <p className="text-sm text-secondary">Event cards for organizer/venue/promoter dashboards</p>
            </div>
            <Badge color="purple" variant="solid">DEV ONLY</Badge>
          </div>
          
          {/* Role Switcher */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-muted uppercase tracking-wider mr-2">Preview as:</span>
            {(["organizer", "venue", "promoter"] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === role
                    ? "bg-accent-primary text-void"
                    : "bg-glass text-secondary hover:text-primary hover:bg-active"
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* ============================================ */}
        {/* FULL CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Full Cards" 
            subtitle="Primary card format for live and upcoming events in grid layouts"
          />
          
          {/* Live Event */}
          <div className="mb-8">
            <CardLabel>Live Event (with pulse indicator)</CardLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur opacity-30 animate-pulse" />
                <div className="relative">
                  <DashboardEventCardFull event={MOCK_EVENTS.live} role={selectedRole} isLive />
                </div>
              </div>
            </div>
          </div>
          
          {/* Upcoming Events */}
          <div className="mb-8">
            <CardLabel>Upcoming Events</CardLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DashboardEventCardFull event={MOCK_EVENTS.upcoming} role={selectedRole} />
              <DashboardEventCardFull event={MOCK_EVENTS.pending} role={selectedRole} />
              <DashboardEventCardFull event={MOCK_EVENTS.noImage} role={selectedRole} />
            </div>
          </div>

          {/* Skeleton */}
          <div className="mb-8">
            <CardLabel>Loading State</CardLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FullCardSkeleton />
              <FullCardSkeleton />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* ROW CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Row Cards" 
            subtitle="Compact horizontal format for event history and lists"
          />
          
          <div className="mb-8">
            <CardLabel>Event History</CardLabel>
            <div className="space-y-3 max-w-4xl">
              <DashboardEventCardRow event={MOCK_EVENTS.past} role={selectedRole} />
              <DashboardEventCardRow event={MOCK_EVENTS.live} role={selectedRole} />
              <DashboardEventCardRow event={MOCK_EVENTS.noImage} role={selectedRole} />
            </div>
          </div>

          {/* Skeleton */}
          <div className="mb-8">
            <CardLabel>Loading State</CardLabel>
            <div className="space-y-3 max-w-4xl">
              <RowCardSkeleton />
              <RowCardSkeleton />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* COMPACT CARDS */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Compact Cards" 
            subtitle="Space-efficient format for dense grids and mobile views"
          />
          
          <div className="mb-8">
            <CardLabel>Compact Grid</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <DashboardEventCardCompact event={MOCK_EVENTS.live} role={selectedRole} isLive />
              <DashboardEventCardCompact event={MOCK_EVENTS.upcoming} role={selectedRole} />
              <DashboardEventCardCompact event={MOCK_EVENTS.pending} role={selectedRole} />
              <DashboardEventCardCompact event={MOCK_EVENTS.noImage} role={selectedRole} />
            </div>
          </div>

          {/* Skeleton */}
          <div className="mb-8">
            <CardLabel>Loading State</CardLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <CompactCardSkeleton />
              <CompactCardSkeleton />
              <CompactCardSkeleton />
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* DATA REFERENCE */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Data Reference" 
            subtitle="Stats and metrics displayed on dashboard cards"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Organizer Stats */}
            <Card padding="compact">
              <div className="flex items-center gap-2 mb-4">
                <Megaphone className="h-4 w-4 text-accent-primary" />
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">Organizer Stats</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Registrations</span>
                  <span className="text-primary font-medium">Total signups</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Check-ins</span>
                  <span className="text-primary font-medium">Scanned entries</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Conversion %</span>
                  <span className="text-primary font-medium">Check-ins / Regs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Capacity</span>
                  <span className="text-primary font-medium">Progress bar</span>
                </div>
              </div>
            </Card>

            {/* Venue Stats */}
            <Card padding="compact">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-accent-secondary" />
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">Venue Stats</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Organizer</span>
                  <span className="text-primary font-medium">Event creator</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Approval Status</span>
                  <span className="text-primary font-medium">Pending/Approved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Registrations</span>
                  <span className="text-primary font-medium">Total signups</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Check-ins</span>
                  <span className="text-primary font-medium">Scanned entries</span>
                </div>
              </div>
            </Card>

            {/* Promoter Stats */}
            <Card padding="compact">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-accent-success" />
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">Promoter Stats</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Referrals</span>
                  <span className="text-primary font-medium">Via your link</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Check-ins</span>
                  <span className="text-primary font-medium">Your refs who entered</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Commission</span>
                  <span className="text-primary font-medium">$ earned</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Referral Link</span>
                  <span className="text-primary font-medium">Copy to share</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ============================================ */}
        {/* COMPONENT API */}
        {/* ============================================ */}
        <section>
          <SectionHeader 
            title="Component API" 
            subtitle="Props and configuration for dashboard cards"
          />
          
          <Card padding="compact">
            <div className="font-mono text-xs space-y-4">
              <div>
                <p className="text-accent-secondary mb-2">// Full Card</p>
                <pre className="text-secondary bg-void p-3 rounded-lg overflow-x-auto">
{`<DashboardEventCardFull
  event={event}
  role="organizer" | "venue" | "promoter"
  isLive={boolean}
/>`}
                </pre>
              </div>
              <div>
                <p className="text-accent-secondary mb-2">// Row Card</p>
                <pre className="text-secondary bg-void p-3 rounded-lg overflow-x-auto">
{`<DashboardEventCardRow
  event={event}
  role="organizer" | "venue" | "promoter"
/>`}
                </pre>
              </div>
              <div>
                <p className="text-accent-secondary mb-2">// Compact Card</p>
                <pre className="text-secondary bg-void p-3 rounded-lg overflow-x-auto">
{`<DashboardEventCardCompact
  event={event}
  role="organizer" | "venue" | "promoter"
  isLive={boolean}
/>`}
                </pre>
              </div>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}

