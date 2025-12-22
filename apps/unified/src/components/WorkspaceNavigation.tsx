"use client";

// Workspace floating navigation - matches landing page design
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, cn } from "@crowdstack/ui";
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Calendar,
  CreditCard,
  Shield,
  Bell,
  Home,
  Building2,
  Users,
  Megaphone,
  LayoutDashboard,
  QrCode,
  BarChart3,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";
import type { UserRole } from "@crowdstack/shared";
import { ImprovedEntitySwitcher as EntitySwitcher } from "./ImprovedEntitySwitcher";
import { NotificationBell } from "./NotificationBell";

interface WorkspaceNavigationProps {
  roles: UserRole[];
  userEmail?: string;
  userId?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export function WorkspaceNavigation({ roles, userEmail, userId }: WorkspaceNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [envBadge, setEnvBadge] = useState<{ label: string; color: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // All navigation items with role requirements
  const allNavItems: NavItem[] = [
    { href: "/app", label: "Home", icon: Home },
    { href: "/app/events", label: "Events", icon: Calendar },
    { href: "/app/venues", label: "Venues", icon: Building2, roles: ["venue_admin", "superadmin"] },
    { href: "/app/team", label: "Team", icon: Users, roles: ["venue_admin", "event_organizer", "superadmin"] },
    { href: "/app/promoters", label: "Promoters", icon: Megaphone, roles: ["event_organizer", "superadmin"] },
    { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin", label: "Admin", icon: Shield, roles: ["superadmin"] },
  ];

  // Filter nav items based on user roles
  const navItems = allNavItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => roles.includes(role));
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set environment badge
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      setEnvBadge({ label: "Local", color: "bg-warning/20 text-warning border-warning/30" });
    } else if (hostname.includes("beta") || hostname.includes("staging")) {
      setEnvBadge({ label: "Beta", color: "bg-warning/20 text-warning border-warning/30" });
    }
    // Don't show badge on production
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: attendee } = await supabase
          .from("attendees")
          .select("name, avatar_url")
          .eq("user_id", authUser.id)
          .single();

        setUser({
          name: attendee?.name || authUser.user_metadata?.name,
          avatar_url: attendee?.avatar_url,
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (userEmail) return userEmail[0].toUpperCase();
    return "U";
  };

  const profileItems = [
    { href: "/me", label: "My Dashboard", icon: Calendar },
    { href: "/me/profile", label: "Profile", icon: User },
    { href: "/me/settings", label: "Settings", icon: Settings },
    { href: "/me/billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit max-w-[95vw] mx-auto">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4 md:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/60 shadow-lg shadow-black/50">
        {/* Logo */}
        <Link href="/app" className="flex items-center transition-all duration-300 hover:scale-105 pr-1 sm:pr-2">
          <Logo variant="full" size="sm" animated={false} className="text-white" />
        </Link>

        <div className="h-4 w-px bg-white/20 hidden md:block" />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-0.5">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-full transition-all duration-300",
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More dropdown for additional items */}
          {navItems.length > 5 && (
            <div className="relative group">
              <button className="flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-all duration-300">
                <span className="hidden lg:inline">More</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                {navItems.slice(5).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-white/20 hidden md:block" />

        {/* Entity Switcher for Superadmin */}
        {roles.includes("superadmin") && (
          <div className="hidden sm:block">
            <EntitySwitcher userRoles={roles} />
          </div>
        )}

        {/* Notification Bell */}
        <div className="hidden sm:block">
          <NotificationBell />
        </div>

        {/* Environment badge */}
        {envBadge && (
          <span className={cn("hidden sm:inline px-2 py-0.5 text-xs font-medium rounded-full border", envBadge.color)}>
            {envBadge.label}
          </span>
        )}

        {/* Desktop Profile Dropdown */}
        <div className="relative hidden sm:block" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-white/80 hover:text-white hover:bg-white/5"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || "Profile"}
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {getUserInitial()}
              </div>
            )}
            <ChevronDown className={cn("h-3 w-3 transition-transform", isProfileOpen && "rotate-180")} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                <p className="text-xs text-white/50 truncate">{userEmail}</p>
              </div>

              {/* Profile Links */}
              <div className="py-1">
                {profileItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Sign Out */}
              <div className="border-t border-white/10 py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="sm:hidden ml-1 p-2 text-white/60 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
            onTouchEnd={(e) => { e.preventDefault(); setIsOpen(false); }}
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg border border-white/20 backdrop-blur-xl bg-black/95 shadow-lg shadow-black/50 z-50 sm:hidden overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {getUserInitial()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                <p className="text-xs text-white/50 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      isActive
                        ? "text-white bg-white/10"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-white/10" />

            {/* Profile Links */}
            <div className="py-2">
              {profileItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-white/10" />

            {/* Sign Out */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

