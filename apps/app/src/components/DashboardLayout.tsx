"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Building2,
  Ticket,
  BarChart3,
  FileText,
  QrCode,
} from "lucide-react";
import { Logo, Dropdown, cn } from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "venue_admin" | "event_organizer" | "promoter" | "superadmin";
  userEmail?: string;
}

export function DashboardLayout({ children, role, userEmail }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "venue_admin":
        return [
          { label: "Dashboard", href: "/app/venue", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Events", href: "/app/venue/events", icon: <Calendar className="h-5 w-5" /> },
          { label: "Attendees", href: "/app/venue/attendees", icon: <Users className="h-5 w-5" /> },
          { label: "Organizers", href: "/app/venue/organizers", icon: <Building2 className="h-5 w-5" /> },
          { label: "Promoters", href: "/app/venue/promoters", icon: <Users className="h-5 w-5" /> },
          { label: "Guest Flags", href: "/app/venue/guests/flags", icon: <Ticket className="h-5 w-5" /> },
          { label: "Reports", href: "/app/venue/reports", icon: <BarChart3 className="h-5 w-5" /> },
          { label: "Settings", href: "/app/venue/settings", icon: <Settings className="h-5 w-5" /> },
        ];
      case "event_organizer":
        return [
          { label: "Dashboard", href: "/app/organizer", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Events", href: "/app/organizer/events", icon: <Calendar className="h-5 w-5" /> },
          { label: "Attendees", href: "/app/organizer/attendees", icon: <Users className="h-5 w-5" /> },
          { label: "Promoters", href: "/app/organizer/promoters", icon: <Users className="h-5 w-5" /> },
          { label: "Payouts", href: "/app/organizer/payouts", icon: <DollarSign className="h-5 w-5" /> },
          { label: "Settings", href: "/app/organizer/settings", icon: <Settings className="h-5 w-5" /> },
        ];
      case "promoter":
        return [
          { label: "Dashboard", href: "/app/promoter", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Events", href: "/app/promoter/events", icon: <Calendar className="h-5 w-5" /> },
          { label: "My Attendees", href: "/app/promoter/attendees", icon: <Users className="h-5 w-5" /> },
          { label: "Earnings", href: "/app/promoter/earnings", icon: <DollarSign className="h-5 w-5" /> },
          { label: "Tools", href: "/app/promoter/tools", icon: <QrCode className="h-5 w-5" /> },
          { label: "Profile", href: "/app/promoter/profile", icon: <User className="h-5 w-5" /> },
        ];
      case "superadmin":
        return [
          { label: "Admin", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getEnvironmentBadge = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      return { label: "Local", color: "bg-warning/10 text-warning border-warning/20" };
    }
    if (hostname.includes("beta") || hostname.includes("staging")) {
      return { label: "Beta", color: "bg-warning/10 text-warning border-warning/20" };
    }
    return { label: "Production", color: "bg-success/10 text-success border-success/20" };
  };

  const envBadge = getEnvironmentBadge();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border">
            <Link href="/" className="flex items-center">
              <Logo variant="full" size="sm" animated={false} className="text-foreground" />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-foreground-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-foreground-muted hover:bg-background hover:text-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <Dropdown
              trigger={
                <div className="flex items-center gap-3 w-full text-left">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {userEmail?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {userEmail || "User"}
                    </p>
                    <p className="text-xs text-foreground-muted truncate">{role}</p>
                  </div>
                </div>
              }
              items={[
                {
                  label: "Profile",
                  onClick: () => {},
                  icon: <User className="h-4 w-4" />,
                },
                {
                  label: "Sign out",
                  onClick: handleSignOut,
                  icon: <LogOut className="h-4 w-4" />,
                  destructive: true,
                },
              ]}
            />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar - Dynamic Island style */}
        <header className="sticky top-4 z-30 mx-4 lg:mx-8">
          <div className="flex h-12 items-center gap-3 px-4 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-white/60 hover:text-white transition-all duration-300"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="lg:hidden h-4 w-px bg-white/20" />
            <div className="flex flex-1 items-center justify-end gap-3">
              <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border", envBadge.color)}>
                {envBadge.label}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

