"use client";

import Link from "next/link";
import { Card, Container, Section } from "@crowdstack/ui";
import { Building2, Calendar, Users, QrCode, Settings, ExternalLink, Merge, AlertTriangle, Shield } from "lucide-react";

export default function AdminDashboardPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3006";

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
      href: `${webUrl}/me`,
      description: "View attendee experience and profile",
      external: true,
      icon: <Users className="h-6 w-6" />,
    },
    {
      name: "Event Landing Page",
      href: `${webUrl}/e`,
      description: "Public event pages and registration",
      external: true,
      icon: <Calendar className="h-6 w-6" />,
    },
    {
      name: "Public Landing Page",
      href: webUrl,
      description: "Marketing site and venue signup",
      external: true,
      icon: <Shield className="h-6 w-6" />,
    },
    {
      name: "Login Page",
      href: `${webUrl}/login`,
      description: "Magic link authentication",
      external: true,
      icon: <Shield className="h-6 w-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-2 text-sm text-foreground-muted">
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
                <span className="font-medium text-foreground">B2B App URL:</span> {appUrl}
              </div>
              <div>
                <span className="font-medium text-foreground">Web App URL:</span> {webUrl}
              </div>
            </div>
          </Card>
        </Container>
      </Section>
    </div>
  );
}
