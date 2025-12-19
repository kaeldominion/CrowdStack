"use client";

import { useState, useEffect } from "react";
import type { UserRole } from "@crowdstack/shared";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@crowdstack/ui";
import { Calendar, Users, Ticket, TrendingUp, BarChart3, Activity, Plus, Zap, DollarSign, Trophy, Target, QrCode, Copy, Check, Building2, Repeat } from "lucide-react";
import Link from "next/link";
import { RegistrationChart } from "@/components/charts/RegistrationChart";
import { EarningsChart } from "@/components/charts/EarningsChart";
import { createBrowserClient } from "@crowdstack/shared";

interface UnifiedDashboardProps {
  userRoles: UserRole[];
}

export function UnifiedDashboard({ userRoles }: UnifiedDashboardProps) {
  const [impersonation, setImpersonation] = useState<{ role: UserRole | "all" | null; entityId: string | null }>({ role: null, entityId: null });
  
  // Read impersonation from cookies (client-side only)
  useEffect(() => {
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cs-impersonate-role="));
    
    const entityCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cs-impersonate-entity-id="));

    let role: UserRole | "all" | null = null;
    if (roleCookie) {
      const roleValue = roleCookie.split("=")[1];
      if (roleValue === "all" || ["venue_admin", "event_organizer", "promoter", "attendee"].includes(roleValue)) {
        role = roleValue as UserRole | "all";
      }
    }
    if (!role) role = "all";

    const entityId = entityCookie ? entityCookie.split("=")[1] : null;

    setImpersonation({ role, entityId });
  }, []);

  // Use impersonated role if set, otherwise use actual user roles
  const effectiveRoles = impersonation.role && impersonation.role !== "all" 
    ? [impersonation.role] 
    : userRoles;
  
  const [venueStats, setVenueStats] = useState({
    totalEvents: 0,
    thisMonth: 0,
    totalCheckIns: 0,
    repeatRate: 0,
    avgAttendance: 0,
    topEvent: "N/A",
  });
  const [organizerStats, setOrganizerStats] = useState({
    totalEvents: 0,
    registrations: 0,
    checkIns: 0,
    promoters: 0,
    conversionRate: 0,
    revenue: 0,
  });
  const [promoterStats, setPromoterStats] = useState({
    totalCheckIns: 0,
    conversionRate: 0,
    totalEarnings: 0,
    rank: 0,
    referrals: 0,
    avgPerEvent: 0,
  });
  const [organizerChartData, setOrganizerChartData] = useState<Array<{ date: string; registrations: number; checkins: number }>>([]);
  const [promoterChartData, setPromoterChartData] = useState<Array<{ date: string; earnings: number }>>([]);
  const [referralLink, setReferralLink] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const isVenue = effectiveRoles.includes("venue_admin");
  const isOrganizer = effectiveRoles.includes("event_organizer");
  const isPromoter = effectiveRoles.includes("promoter");
  const isSuperadmin = userRoles.includes("superadmin") && (!impersonation.role || impersonation.role === "all");

  useEffect(() => {
    loadAllStats();
    if (isPromoter) {
      loadReferralLink();
    }
  }, [userRoles, isPromoter]);

  const loadAllStats = async () => {
    setLoading(true);
    const promises = [];

    if (isVenue) {
      promises.push(
        fetch("/api/venue/dashboard-stats")
          .then((r) => r.json())
          .then((data) => setVenueStats(data.stats || venueStats))
          .catch((e) => console.error("Failed to load venue stats:", e))
      );
    }

    if (isOrganizer) {
      promises.push(
        fetch("/api/organizer/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setOrganizerStats(data.stats || organizerStats);
            setOrganizerChartData(data.chartData || []);
          })
          .catch((e) => console.error("Failed to load organizer stats:", e))
      );
    }

    if (isPromoter) {
      promises.push(
        fetch("/api/promoter/dashboard-stats")
          .then((r) => r.json())
          .then((data) => {
            setPromoterStats(data.stats || promoterStats);
            setPromoterChartData(data.earningsChartData || []);
          })
          .catch((e) => console.error("Failed to load promoter stats:", e))
      );
    }

    await Promise.all(promises);
    setLoading(false);
  };

  const loadReferralLink = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promoter } = await supabase
        .from("promoters")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (promoter) {
        const link = `/e/[eventSlug]?ref=${promoter.id}`;
        setReferralLink(link);
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
      }
    } catch (error) {
      console.error("Error loading referral link:", error);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-foreground-muted">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/60">
            {impersonation.role && impersonation.role !== "all" 
              ? `Viewing as: ${impersonation.role.replace(/_/g, " ")}${impersonation.entityId ? ` (Entity ID: ${impersonation.entityId.substring(0, 8)}...)` : ""}`
              : effectiveRoles.length > 1 
                ? "Overview across all your roles" 
                : "Overview of your performance"}
          </p>
        </div>
        <div className="flex gap-2">
          {isVenue && (
            <Link href="/app/venue/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
          {isOrganizer && (
            <Link href="/app/organizer/events/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Venue Admin Section */}
      {isVenue && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Venue Performance
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Events</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{venueStats.totalEvents}</p>
                </div>
                <Calendar className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">This Month</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{venueStats.thisMonth}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{venueStats.totalCheckIns}</p>
                </div>
                <Ticket className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Repeat Rate</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{venueStats.repeatRate}%</p>
                </div>
                <Repeat className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
          </div>
        </section>
      )}

      {/* Event Organizer Section */}
      {isOrganizer && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Management
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Total Events</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{organizerStats.totalEvents}</p>
                </div>
                <Calendar className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{organizerStats.registrations}</p>
                </div>
                <Ticket className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{organizerStats.checkIns}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Promoters</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{organizerStats.promoters}</p>
                </div>
                <Users className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
          </div>
          {organizerChartData.length > 0 && (
            <BentoCard span={4}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Registrations vs Check-ins</p>
                  <BarChart3 className="h-4 w-4 text-white/40" />
                </div>
                <RegistrationChart data={organizerChartData} height={250} />
              </div>
            </BentoCard>
          )}
        </section>
      )}

      {/* Promoter Section */}
      {isPromoter && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Promoter Tools
          </h2>
          
          {/* QR Code & Referral Link */}
          <BentoCard span={3}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Your Promoter Card</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mb-4" />
                  ) : (
                    <QrCode className="w-32 h-32 text-white/20 mb-4" />
                  )}
                  <p className="text-xs text-white/60 text-center">Scan to share your link</p>
                </div>
                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Referral Link</p>
                    <div className="flex items-center gap-2 p-3 rounded-md bg-white/5 border border-white/10">
                      <input
                        type="text"
                        value={referralLink || "Loading..."}
                        readOnly
                        className="flex-1 bg-transparent text-white text-sm font-mono"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyLink}
                        className="shrink-0"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BentoCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Registrations</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{promoterStats.referrals}</p>
                </div>
                <Ticket className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Check-ins</p>
                  <p className="text-3xl font-bold tracking-tighter text-white">{promoterStats.totalCheckIns}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
            <BentoCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">Earnings</p>
                  <p className="text-3xl font-bold tracking-tighter text-white font-mono">${promoterStats.totalEarnings}</p>
                </div>
                <DollarSign className="h-5 w-5 text-white/40" />
              </div>
            </BentoCard>
          </div>

          {promoterChartData.length > 0 && (
            <BentoCard span={3}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium">Earnings Over Time</p>
                  <DollarSign className="h-4 w-4 text-white/40" />
                </div>
                <EarningsChart data={promoterChartData} height={250} />
              </div>
            </BentoCard>
          )}
        </section>
      )}

      {/* Superadmin Section */}
      {isSuperadmin && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Admin Access
          </h2>
          <BentoCard>
            <div className="space-y-4">
              <p className="text-sm text-white/60">
                You have superadmin access. Visit the admin dashboard for full system management.
              </p>
              <Link href="/admin">
                <Button>
                  Go to Admin Dashboard
                </Button>
              </Link>
            </div>
          </BentoCard>
        </section>
      )}
    </div>
  );
}

