"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Container, Section } from "@crowdstack/ui";
import { Building2, Calendar, Users, QrCode, Settings, ExternalLink, Merge, AlertTriangle, Shield, LogOut, Home } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    
    // Get user info
    const loadUser = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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
    <div className="min-h-screen bg-background">
      {/* Header with navigation and logout */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-foreground hover:text-primary transition-colors">
                <Home className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {userEmail && (
                <span className="text-sm text-foreground-muted hidden sm:block">
                  {userEmail}
                </span>
              )}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-surface rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{loggingOut ? "Signing out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </Container>
      </header>

      <Section spacing="lg">
        <Container>
          <div className="mb-12">
            <p className="text-sm text-foreground-muted">
              Quick access to all dashboards, tools, and areas of the platform
            </p>
          </div>

          {/* Quick Access */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Access</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {dashboards.map((dashboard) => (
                <Link key={dashboard.href} href={dashboard.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                      {dashboard.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{dashboard.name}</h3>
                    <p className="text-xs text-foreground-muted">{dashboard.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Management */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Management</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {adminManagement.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{item.name}</h3>
                    <p className="text-xs text-foreground-muted">{item.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Tools */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Admin Tools</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminTools.map((tool) => (
                <Link key={tool.href} href={tool.href}>
                  <Card hover className="h-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/10 text-warning mb-4">
                      {tool.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{tool.name}</h3>
                    <p className="text-xs text-foreground-muted">{tool.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Web App Areas */}
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Web App Areas</h2>
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
                        <ExternalLink className="h-4 w-4 text-foreground-subtle" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{area.name}</h3>
                    <p className="text-xs text-foreground-muted">{area.description}</p>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-4">Quick Info</h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-foreground-muted sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">App URL:</span> {baseUrl || "Loading..."}
              </div>
              <div>
                <span className="font-medium text-foreground">Environment:</span> {process.env.NEXT_PUBLIC_APP_ENV || "development"}
              </div>
            </div>
          </Card>
        </Container>
      </Section>
    </div>
  );
}
