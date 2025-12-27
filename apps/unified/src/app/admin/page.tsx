"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Container, Section } from "@crowdstack/ui";
import { Building2, Calendar, Users, QrCode, Settings, ExternalLink, Merge, AlertTriangle, Shield, Radio, MapPin, UserCheck, Download, Palette, TrendingUp } from "lucide-react";

interface LiveEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  capacity: number | null;
  venue: { id: string; name: string } | null;
  organizer: { id: string; name: string } | null;
  registrations: number;
  checkins: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);

  useEffect(() => {
    setBaseUrl(window.location.origin);

    // Load live events
    const loadLiveEvents = async () => {
      try {
        const response = await fetch("/api/admin/events/live");
        if (response.ok) {
          const data = await response.json();
          setLiveEvents(data.events || []);
        }
      } catch (error) {
        console.error("Error loading live events:", error);
      } finally {
        setLoadingLive(false);
      }
    };
    loadLiveEvents();

    // Refresh live events every 30 seconds
    const interval = setInterval(loadLiveEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const dashboards = [
    {
      name: "Unified Dashboard",
      href: "/app",
      description: "Access all features based on your roles - venue, organizer, promoter",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Door Scanner",
      href: "/door",
      description: "Scan QR codes and check-in attendees",
      icon: <QrCode className="h-6 w-6" />,
    },
  ];

  const adminManagement = [
    {
      name: "Venues",
      href: "/admin/venues",
      description: "View and manage all venues",
      icon: <Building2 className="h-6 w-6" />,
    },
    {
      name: "Organizers",
      href: "/admin/organizers",
      description: "View and manage event organizers",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Events",
      href: "/admin/events",
      description: "View and manage all events",
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Promoters",
      href: "/admin/promoters",
      description: "View all promoters and performance",
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: "Users",
      href: "/admin/users",
      description: "Manage users and roles",
      icon: <Shield className="h-6 w-6" />,
    },
    {
      name: "Attendees",
      href: "/admin/attendees",
      description: "Comprehensive attendee database",
      icon: <Users className="h-6 w-6" />,
    },
  ];

  const adminTools = [
    {
      name: "Merge Duplicate Attendees",
      href: "/admin/attendees/merge",
      description: "Find and merge duplicate attendee records",
      icon: <Merge className="h-6 w-6" />,
    },
    {
      name: "Fix Promoter Attribution",
      href: "/admin/promoters/attribution",
      description: "Correct promoter referral attribution",
      icon: <Settings className="h-6 w-6" />,
    },
    {
      name: "Resolve Disputes",
      href: "/admin/disputes",
      description: "Handle payout disputes and conflicts",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
  ];

  const brandTools = [
    {
      name: "Download Brand Assets",
      href: "/admin/tools/brand-assets",
      description: "Download logos, icons, and brand materials",
      icon: <Download className="h-6 w-6" />,
    },
    {
      name: "XP Ledger",
      href: "/admin/tools/xp-ledger",
      description: "View and analyze XP transactions",
      icon: <TrendingUp className="h-6 w-6" />,
    },
  ];

  const webAppAreas = [
    {
      name: "Attendee Dashboard",
      href: "/me",
      description: "View attendee experience and profile",
      external: false,
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: "Event Landing Page",
      href: "/e",
      description: "Public event pages and registration",
      external: false,
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Public Landing Page",
      href: "/",
      description: "Marketing site and venue signup",
      external: false,
      icon: <Shield className="h-6 w-6" />,
    },
    {
      name: "Login Page",
      href: "/login",
      description: "Magic link authentication",
      external: false,
      icon: <Shield className="h-6 w-6" />,
    },
  ];

  return (
    <Section spacing="lg">
      <Container>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-sm text-secondary">
            Quick access to all dashboards, tools, and areas of the platform
          </p>
        </div>

          {/* Live Events Section */}
          {liveEvents.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <h2 className="text-xl font-semibold text-primary">Live Events</h2>
                </div>
                <span className="text-sm text-secondary">
                  {liveEvents.length} event{liveEvents.length !== 1 ? "s" : ""} happening now
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {liveEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    hover 
                    className="h-full border-l-4 border-l-red-500 cursor-pointer"
                    onClick={() => router.push(`/admin/events/${event.id}`)}
                  >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-primary truncate">
                            {event.name}
                          </h3>
                          {event.venue && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-secondary flex-shrink-0" />
                              <span className="text-xs text-secondary truncate">
                                {event.venue.name}
                              </span>
                            </div>
                          )}
                        </div>
                        <Radio className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-secondary" />
                          <span className="text-secondary">
                            {event.registrations} registered
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-success" />
                          <span className="text-success font-medium">
                            {event.checkins} checked in
                          </span>
                        </div>
                      </div>

                      {event.capacity && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                              style={{
                                width: `${Math.min((event.checkins / event.capacity) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-secondary mt-1">
                            {Math.round((event.checkins / event.capacity) * 100)}% capacity
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/door/${event.id}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <QrCode className="h-3 w-3" />
                          Door Scanner
                        </Link>
                      </div>
                    </Card>
                ))}
              </div>
            </div>
          )}

          {loadingLive && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-3 w-3 bg-foreground-muted rounded-full animate-pulse" />
                <h2 className="text-xl font-semibold text-secondary">Loading live events...</h2>
              </div>
            </div>
          )}

          {/* Quick Access */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Quick Access</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {dashboards.map((dashboard) => (
                <Link key={dashboard.href} href={dashboard.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-secondary/10 text-primary mb-4">
                      {dashboard.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-primary mb-2">{dashboard.name}</h3>
                    <p className="text-xs text-secondary">{dashboard.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Management */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Management</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {adminManagement.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-secondary/10 text-primary mb-4">
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-primary mb-2">{item.name}</h3>
                    <p className="text-xs text-secondary">{item.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Tools */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Admin Tools</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminTools.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/10 text-warning mb-4">
                      {tool.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-primary mb-2">{tool.name}</h3>
                    <p className="text-xs text-secondary">{tool.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Brand & Assets */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Brand & Assets</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {brandTools.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-secondary/10 text-primary mb-4">
                      {tool.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-primary mb-2">{tool.name}</h3>
                    <p className="text-xs text-secondary">{tool.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Web App Areas */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-primary mb-4">Web App Areas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {webAppAreas.map((area) => (
                <a
                  key={area.href}
                  href={area.href}
                  target={area.external ? "_blank" : undefined}
                  rel={area.external ? "noopener noreferrer" : undefined}
                >
                  <Card hover className="h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
                        {area.icon}
                      </div>
                      {area.external && (
                        <ExternalLink className="h-4 w-4 text-primary-subtle" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-primary mb-2">{area.name}</h3>
                    <p className="text-xs text-secondary">{area.description}</p>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <Card>
            <h3 className="text-sm font-semibold text-primary mb-4">Quick Info</h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-secondary sm:grid-cols-2">
              <div>
                <span className="font-medium text-primary">App URL:</span> {baseUrl || "Loading..."}
              </div>
              <div>
                <span className="font-medium text-primary">Environment:</span> {process.env.NEXT_PUBLIC_APP_ENV || "development"}
              </div>
            </div>
          </Card>
        </Container>
      </Section>
  );
}
