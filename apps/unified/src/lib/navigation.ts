import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@crowdstack/shared";
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Settings,
  User,
  Building2,
  Ticket,
  BarChart3,
  QrCode,
  Shield,
  Clock,
  Star,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  badge?: React.ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  // Home/Dashboard
  {
    label: "Home",
    href: "/app",
    icon: LayoutDashboard,
    roles: ["venue_admin", "event_organizer", "promoter", "superadmin"],
  },

  // Venue Admin Routes
  {
    label: "Venue Dashboard",
    href: "/app/venue",
    icon: Building2,
    roles: ["venue_admin"],
  },
  {
    label: "Events",
    href: "/app/venue/events",
    icon: Calendar,
    roles: ["venue_admin"],
  },
  {
    label: "Pending Approvals",
    href: "/app/venue/events/pending",
    icon: Clock,
    roles: ["venue_admin"],
  },
  {
    label: "Attendees",
    href: "/app/venue/attendees",
    icon: Users,
    roles: ["venue_admin"],
  },
  {
    label: "Organizers",
    href: "/app/venue/organizers",
    icon: Building2,
    roles: ["venue_admin"],
  },
  {
    label: "Pre-approved",
    href: "/app/venue/organizers/preapproved",
    icon: Star,
    roles: ["venue_admin"],
  },
  {
    label: "Promoters",
    href: "/app/venue/promoters",
    icon: Users,
    roles: ["venue_admin"],
  },
  {
    label: "Guest Flags",
    href: "/app/venue/guests/flags",
    icon: Ticket,
    roles: ["venue_admin"],
  },
  {
    label: "Reports",
    href: "/app/venue/reports",
    icon: BarChart3,
    roles: ["venue_admin"],
  },
  {
    label: "Venue Settings",
    href: "/app/venue/settings",
    icon: Settings,
    roles: ["venue_admin"],
  },

  // Event Organizer Routes
  {
    label: "Organizer Dashboard",
    href: "/app/organizer",
    icon: LayoutDashboard,
    roles: ["event_organizer"],
  },
  {
    label: "My Events",
    href: "/app/organizer/events",
    icon: Calendar,
    roles: ["event_organizer"],
  },
  {
    label: "Attendees",
    href: "/app/organizer/attendees",
    icon: Users,
    roles: ["event_organizer"],
  },
  {
    label: "Promoters",
    href: "/app/organizer/promoters",
    icon: Users,
    roles: ["event_organizer"],
  },
  {
    label: "Payouts",
    href: "/app/organizer/payouts",
    icon: DollarSign,
    roles: ["event_organizer"],
  },
  {
    label: "Organizer Settings",
    href: "/app/organizer/settings",
    icon: Settings,
    roles: ["event_organizer"],
  },

  // Promoter Routes
  {
    label: "Promoter Dashboard",
    href: "/app/promoter",
    icon: LayoutDashboard,
    roles: ["promoter"],
  },
  {
    label: "Events",
    href: "/app/promoter/events",
    icon: Calendar,
    roles: ["promoter"],
  },
  {
    label: "My Attendees",
    href: "/app/promoter/attendees",
    icon: Users,
    roles: ["promoter"],
  },
  {
    label: "Earnings",
    href: "/app/promoter/earnings",
    icon: DollarSign,
    roles: ["promoter"],
  },
  {
    label: "Tools",
    href: "/app/promoter/tools",
    icon: QrCode,
    roles: ["promoter"],
  },
  {
    label: "Profile",
    href: "/app/promoter/profile",
    icon: User,
    roles: ["promoter"],
  },

  // Admin Routes
  {
    label: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
    roles: ["superadmin"],
  },
  {
    label: "Venues",
    href: "/admin/venues",
    icon: Building2,
    roles: ["superadmin"],
  },
  {
    label: "Events",
    href: "/admin/events",
    icon: Calendar,
    roles: ["superadmin"],
  },
  {
    label: "Promoters",
    href: "/admin/promoters",
    icon: Users,
    roles: ["superadmin"],
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Shield,
    roles: ["superadmin"],
  },
  {
    label: "Attendees",
    href: "/admin/attendees",
    icon: Users,
    roles: ["superadmin"],
  },
];

/**
 * Filter navigation items based on user roles
 * Returns items where user has at least one of the required roles
 */
export function filterNavItemsByRoles(items: NavItem[], userRoles: UserRole[]): NavItem[] {
  return items.filter((item) => {
    // Show item if user has ANY of the required roles
    return item.roles.some((role) => userRoles.includes(role));
  });
}

/**
 * Get navigation items for a specific user
 */
export function getNavItemsForUser(userRoles: UserRole[]): NavItem[] {
  return filterNavItemsByRoles(NAV_ITEMS, userRoles);
}
