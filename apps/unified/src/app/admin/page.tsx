"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Container, Section } from "@crowdstack/ui";
import { Building2, Calendar, Users, QrCode, Settings, ExternalLink, Merge, AlertTriangle, Shield, Radio, MapPin, UserCheck, Download, Palette, TrendingUp, ScanLine, Mail, Database } from "lucide-react";

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
      name: "DJs",
      href: "/admin/djs",
      description: "View and manage DJ profiles",
      icon: <Radio className="h-6 w-6" />,
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
      name: "Database Diagnostics",
      href: "/admin/diagnostics",
      description: "Query database entries by slug to diagnose caching/data issues",
      icon: <Database className="h-6 w-6" />,
    },
    {
      name: "Dynamic QR Generator",
      href: "/admin/tools/qr-generator",
      description: "Create reusable QR codes with dynamic URL redirects",
      icon: <QrCode className="h-6 w-6" />,
    },
    {
      name: "QR Code Test Tool",
      href: "/dev/qr-test",
      description: "Scan or paste QR codes to verify registration attribution",
      icon: <ScanLine className="h-6 w-6" />,
    },
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
      name: "Design System",
      href: "/design-playground",
      description: "View design system components and patterns",
      icon: <Palette className="h-6 w-6" />,
    },
    {
      name: "Download Brand Assets",
      href: "/admin/tools/brand-assets",
      description: "Download logos, icons, and brand materials",
      icon: <Download className="h-6 w-6" />,
    },
    {
      name: "Email Signature Generator",
      href: "/admin/tools/email-signature",
      description: "Create professional email signatures for your team",
      icon: <Mail className="h-6 w-6" />,
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
        <div className="mb-6">
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-sm text-secondary">
            Quick access to all dashboards, tools, and areas of the platform
          </p>
        </div>

          {/* Live Events Section */}
          {liveEvents.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-accent-error rounded-full animate-pulse" />
                  <h2 className="section-header">Live Events</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  {liveEvents.length} {liveEvents.length !== 1 ? "EVENTS" : "EVENT"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    hover 
                    className="h-full border-l-4 border-l-accent-error cursor-pointer"
                    onClick={() => router.push(`/admin/events/${event.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Radio className="h-3 w-3 text-accent-error animate-pulse flex-shrink-0" />
                          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-accent-error">
                            LIVE
                          </p>
                        </div>
                        <h3 className="text-sm font-semibold text-primary truncate mb-1">
                          {event.name}
                        </h3>
                        {event.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted flex-shrink-0" />
                            <span className="text-xs text-secondary truncate">
                              {event.venue.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3 pt-3 border-t border-border-subtle">
                      <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">
                          Registered
                        </p>
                        <p className="text-lg font-bold text-primary">{event.registrations}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">
                          Checked In
                        </p>
                        <p className="text-lg font-bold text-accent-success">{event.checkins}</p>
                      </div>
                    </div>

                    {event.capacity && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">
                            Capacity
                          </p>
                          <p className="text-xs font-medium text-secondary">
                            {Math.round((event.checkins / event.capacity) * 100)}%
                          </p>
                        </div>
                        <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-success transition-all"
                            style={{
                              width: `${Math.min((event.checkins / event.capacity) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border-subtle">
                      <Link
                        href={`/door/${event.id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-accent-secondary hover:text-accent-primary flex items-center gap-1.5 transition-colors"
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
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 bg-muted rounded-full animate-pulse" />
                <h2 className="section-header">Loading live events...</h2>
              </div>
            </div>
          )}

          {/* Admin Management */}
          <div className="mb-8">
            <h2 className="section-header">Management</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {adminManagement.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card hover className="h-full !p-3">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-secondary/10 text-accent-secondary mb-2">
                        {item.icon}
                      </div>
                      <h3 className="text-xs font-semibold text-primary mb-1">{item.name}</h3>
                      <p className="text-[10px] text-secondary line-clamp-2">{item.description}</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Tools */}
          <div className="mb-8">
            <h2 className="section-header">Admin Tools</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adminTools.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card hover className="h-full !p-4 border-accent-warning/30 bg-accent-warning/5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-primary mb-1">{tool.name}</h3>
                        <p className="text-xs text-secondary">{tool.description}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-warning/10 text-accent-warning flex-shrink-0">
                        {tool.icon}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Brand & Assets */}
          <div className="mb-8">
            <h2 className="section-header">Brand & Assets</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brandTools.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card hover className="h-full !p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-primary mb-1">{tool.name}</h3>
                        <p className="text-xs text-secondary">{tool.description}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-secondary/10 text-accent-secondary flex-shrink-0">
                        {tool.icon}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Web App Areas */}
          <div className="mb-8">
            <h2 className="section-header">Web App Areas</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {webAppAreas.map((area) => (
                <a
                  key={area.href}
                  href={area.href}
                  target={area.external ? "_blank" : undefined}
                  rel={area.external ? "noopener noreferrer" : undefined}
                >
                  <Card hover className="h-full !p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-primary mb-1">{area.name}</h3>
                        <p className="text-xs text-secondary">{area.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-success/10 text-accent-success">
                          {area.icon}
                        </div>
                        {area.external && (
                          <ExternalLink className="h-4 w-4 text-muted" />
                        )}
                      </div>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <Card className="!p-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">Quick Info</h3>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">App URL</p>
                <p className="text-sm text-primary font-mono">{baseUrl || "Loading..."}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-1">Environment</p>
                <p className="text-sm text-primary font-mono">{process.env.NEXT_PUBLIC_APP_ENV || "development"}</p>
              </div>
            </div>
          </Card>
        </Container>
      </Section>
  );
}
