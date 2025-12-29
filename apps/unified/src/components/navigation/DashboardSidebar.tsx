"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@crowdstack/ui";
import {
  Calendar,
  LayoutGrid,
  Users,
  Megaphone,
  CreditCard,
  Settings,
  User,
  Shield,
  Building2,
  Music,
  BarChart3,
  Clock,
  Star,
  Ticket,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Radio,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

// Venue Admin Sidebar Items
const VENUE_SIDEBAR_ITEMS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
    ],
  },
  {
    title: "Events",
    items: [
      { href: "/app/venue/events", label: "All Events", icon: Calendar },
      { href: "/app/venue/events/pending", label: "Pending Approvals", icon: Clock },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/app/venue/attendees", label: "Attendees", icon: Users },
      { href: "/app/venue/organizers", label: "Organizers", icon: Building2 },
      { href: "/app/venue/organizers/preapproved", label: "Pre-approved", icon: Star },
      { href: "/app/venue/promoters", label: "Promoters", icon: Megaphone },
      { href: "/app/venue/users", label: "Team", icon: Users },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/app/venue/guests/flags", label: "Guest Flags", icon: Ticket },
      { href: "/app/venue/reports", label: "Reports", icon: BarChart3 },
      { href: "/app/venue/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Organizer Sidebar Items
const ORGANIZER_SIDEBAR_ITEMS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
    ],
  },
  {
    title: "Events",
    items: [
      { href: "/app/organizer/events", label: "My Events", icon: Calendar },
      { href: "/app/organizer/events/new", label: "Create Event", icon: Calendar },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/app/organizer/attendees", label: "Attendees", icon: Users },
      { href: "/app/organizer/promoters", label: "Promoters", icon: Megaphone },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/app/organizer/payouts", label: "Payouts", icon: DollarSign },
      { href: "/app/organizer/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Promoter Sidebar Items
const PROMOTER_SIDEBAR_ITEMS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
    ],
  },
  {
    title: "Events",
    items: [
      { href: "/app/promoter/events", label: "Events", icon: Calendar },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/app/promoter/attendees", label: "My Attendees", icon: Users },
      { href: "/app/promoter/earnings", label: "Earnings", icon: CreditCard },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/app/promoter/profile", label: "Profile", icon: User },
    ],
  },
];

// DJ Sidebar Items
const DJ_SIDEBAR_ITEMS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/app/dj", label: "Dashboard", icon: LayoutGrid, exact: true },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/app/dj/events", label: "Events", icon: Calendar },
      { href: "/app/dj/mixes", label: "Mixes", icon: Music },
    ],
  },
  {
    title: "Performance",
    items: [
      { href: "/app/dj/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/app/dj/profile", label: "Profile", icon: User },
    ],
  },
];

// Admin Sidebar Items
const ADMIN_SIDEBAR_ITEMS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: Shield, exact: true },
      { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
    ],
  },
  {
    title: "Entities",
    items: [
      { href: "/admin/venues", label: "Venues", icon: Building2 },
      { href: "/admin/events", label: "Events", icon: Calendar },
      { href: "/admin/organizers", label: "Organizers", icon: Building2 },
      { href: "/admin/promoters", label: "Promoters", icon: Megaphone },
      { href: "/admin/djs", label: "DJs", icon: Radio },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/users", label: "All Users", icon: Users },
      { href: "/admin/attendees", label: "Attendees", icon: Users },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
      { href: "/admin/tools/xp-ledger", label: "XP Ledger", icon: Wrench },
      { href: "/admin/tools/brand-assets", label: "Brand Assets", icon: Wrench },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const supabase = createBrowserClient();

  // Load user roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          if (roles) {
            setUserRoles(roles.map(r => r.role));
          }
        }
      } catch (error) {
        console.error("Error loading roles:", error);
      }
    };
    loadRoles();
  }, [supabase]);

  // Determine which sidebar items to show based on current path
  const getSidebarSections = (): SidebarSection[] => {
    if (pathname?.startsWith("/admin")) {
      return ADMIN_SIDEBAR_ITEMS;
    }
    if (pathname?.startsWith("/app/venue")) {
      return VENUE_SIDEBAR_ITEMS;
    }
    if (pathname?.startsWith("/app/organizer")) {
      return ORGANIZER_SIDEBAR_ITEMS;
    }
    if (pathname?.startsWith("/app/promoter")) {
      return PROMOTER_SIDEBAR_ITEMS;
    }
    if (pathname?.startsWith("/app/dj")) {
      return DJ_SIDEBAR_ITEMS;
    }
    
    // For /app root, show sidebar based on primary role
    if (pathname === "/app" || pathname === "/app/") {
      if (userRoles.includes("superadmin")) return ADMIN_SIDEBAR_ITEMS;
      if (userRoles.includes("venue_admin")) return VENUE_SIDEBAR_ITEMS;
      if (userRoles.includes("event_organizer")) return ORGANIZER_SIDEBAR_ITEMS;
      if (userRoles.includes("promoter")) return PROMOTER_SIDEBAR_ITEMS;
    }
    
    return [];
  };

  const sidebarSections = getSidebarSections();

  // Don't render if no sidebar items
  if (sidebarSections.length === 0) return null;

  const isItemActive = (item: SidebarNavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname?.startsWith(`${item.href}/`);
  };

  // Get current dashboard name for header
  const getDashboardName = () => {
    if (pathname?.startsWith("/admin")) return "Admin";
    if (pathname?.startsWith("/app/venue")) return "Venue";
    if (pathname?.startsWith("/app/organizer")) return "Organizer";
    if (pathname?.startsWith("/app/promoter")) return "Promoter";
    if (pathname?.startsWith("/app/dj")) return "DJ";
    return "Dashboard";
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-20 bottom-0 z-40",
        "bg-glass/50 backdrop-blur-xl border-r border-border-subtle",
        "transition-all duration-300 ease-in-out",
        "flex flex-col",
        "hidden lg:flex", // Hidden on mobile/tablet, visible on desktop
        isCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Header with collapse toggle */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-border-subtle",
        isCollapsed && "justify-center"
      )}>
        {!isCollapsed && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
            {getDashboardName()}
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-active/50 text-muted hover:text-primary transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {sidebarSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && "mt-4")}>
            {/* Section Title */}
            {!isCollapsed && (
              <div className="px-3 py-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted">
                  {section.title}
                </span>
              </div>
            )}
            
            {/* Section Items */}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      "transition-all duration-200",
                      isCollapsed && "justify-center px-2",
                      isActive
                        ? "bg-accent-primary/15 text-accent-primary border border-accent-primary/20"
                        : "text-secondary hover:text-primary hover:bg-active/50"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={cn(
                      "flex-shrink-0",
                      isCollapsed ? "w-5 h-5" : "w-4 h-4"
                    )} />
                    {!isCollapsed && (
                      <span className="text-sm font-medium truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

