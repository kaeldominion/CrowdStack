"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@crowdstack/ui";
import { Calendar, TrendingUp, Ticket, Repeat, BarChart3, Users, Plus, ExternalLink, Globe, Eye, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function VenueDashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    thisMonth: 0,
    totalCheckIns: 0,
    repeatRate: 0,
    avgAttendance: 0,
    topEvent: "N/A",
  });
  const [venue, setVenue] = useState<{
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [noVenue, setNoVenue] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/venue/dashboard-stats");
      if (!response.ok) {
        if (response.status === 403) {
          setNoVenue(true);
        }
        throw new Error("Failed to load stats");
      }
      const data = await response.json();
      setStats(data.stats || stats);
      if (data.venue) {
        setVenue(data.venue);
      }
      // Check if all stats are zero/empty, which might indicate no venue
      if (data.stats && data.stats.topEvent === "N/A" && data.stats.totalEvents === 0) {
        setNoVenue(true);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pt-4">
        <div className="text-center py-12">
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (noVenue) {
    return (
      <div className="space-y-8 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-white">Dashboard</h1>
            <p className="mt-2 text-sm text-white/60">
              Overview of your venue performance
            </p>
          </div>
        </div>
        <BentoCard span={3}>
          <div className="text-center py-12 space-y-4">
            <p className="text-xl font-semibold text-white">No Venue Assigned</p>
            <p className="text-white/60 max-w-md mx-auto">
              You don't have access to any venues yet. Please contact an administrator to be assigned to a venue.
            </p>
            <p className="text-sm text-white/40">
              If you're a superadmin, you can use the entity switcher in the top bar to view as a specific venue.
            </p>
          </div>
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4">
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

      {/* Public Profile Card */}
      <BentoCard span={4}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Venue Image/Logo Preview */}
          <div className="flex-shrink-0">
            {venue?.cover_image_url ? (
              <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden border border-white/10">
                <Image
                  src={venue.cover_image_url}
                  alt={venue.name || "Venue"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : venue?.logo_url ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                <Image
                  src={venue.logo_url}
                  alt={venue.name || "Venue"}
                  fill
                  className="object-contain p-4"
                />
              </div>
            ) : (
              <div className="w-full md:w-48 h-32 rounded-lg border border-white/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-white/40" />
              </div>
            )}
          </div>

          {/* Venue Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-white/60" />
                <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
                  Public Profile
                </p>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{venue?.name || "Venue"}</h2>
              {venue?.slug ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-md border border-white/10">
                    <code className="text-sm text-white/80 font-mono flex-1 truncate">
                      {(() => {
                        // Get web URL from current origin (replace app subdomain with web)
                        if (typeof window !== "undefined") {
                          const origin = window.location.origin;
                          // Replace app subdomain with web subdomain
                          const webUrl = origin.replace(/app(-beta)?\./, "");
                          return `${webUrl}/v/${venue.slug}`;
                        }
                        return `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/v/${venue.slug}`;
                      })()}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const origin = window.location.origin;
                        const webUrl = origin.replace(/app(-beta)?\./, "");
                        const url = `${webUrl}/v/${venue.slug}`;
                        navigator.clipboard.writeText(url);
                        alert("Link copied to clipboard!");
                      }}
                      className="text-xs"
                    >
                      Copy
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a
                      href={(() => {
                        if (typeof window !== "undefined") {
                          const origin = window.location.origin;
                          const webUrl = origin.replace(/app(-beta)?\./, "");
                          return `${webUrl}/v/${venue.slug}`;
                        }
                        return `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/v/${venue.slug}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="primary" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Live Profile
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                    <Link href="/app/venue/settings">
                      <Button variant="secondary" size="sm">
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    Set up your public profile to share your venue with event-goers
                  </p>
                  <Link href="/app/venue/settings">
                    <Button variant="primary" size="sm">
                      Set Up Public Profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </BentoCard>

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
  );
}
