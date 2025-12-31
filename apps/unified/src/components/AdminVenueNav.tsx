"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@crowdstack/ui";
import { LayoutGrid, Settings, Users, Calendar, BarChart3 } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export function AdminVenueNav() {
  const params = useParams();
  const pathname = usePathname();
  const venueId = params.venueId as string;

  const navItems: NavItem[] = [
    {
      label: "Overview",
      href: `/admin/venues/${venueId}`,
      icon: LayoutGrid,
      exact: true,
    },
    {
      label: "Settings",
      href: `/admin/venues/${venueId}/settings`,
      icon: Settings,
    },
    {
      label: "Team",
      href: `/admin/venues/${venueId}/team`,
      icon: Users,
    },
    {
      label: "Events",
      href: `/admin/venues/${venueId}/events`,
      icon: Calendar,
    },
    {
      label: "Reports",
      href: `/admin/venues/${venueId}/reports`,
      icon: BarChart3,
    },
  ];

  return (
    <nav className="flex gap-1 border-b border-border-subtle">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact 
          ? pathname === item.href 
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              isActive
                ? "border-accent-primary text-accent-primary"
                : "border-transparent text-secondary hover:text-primary hover:border-border-subtle"
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

