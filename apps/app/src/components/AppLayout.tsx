"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { Logo, Dropdown, cn } from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared";
import type { UserRole } from "@crowdstack/shared";
import { getNavItemsForUser } from "@/lib/navigation";
import { UserProfileModal } from "./UserProfileModal";
import { ImprovedEntitySwitcher as EntitySwitcher, getImpersonation } from "./ImprovedEntitySwitcher";

interface AppLayoutProps {
  children: ReactNode;
  roles: UserRole[];
  userEmail?: string;
  userId?: string;
}

export function AppLayout({ children, roles, userEmail, userId }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>(roles);
  const [envBadge, setEnvBadge] = useState<{ label: string; color: string } | null>(null);
  const [impersonation, setImpersonation] = useState<{ role: UserRole | "all" | null; entityId: string | null }>({ role: null, entityId: null });
  const [mounted, setMounted] = useState(false);
  const supabase = createBrowserClient();

  // Always call hook at top level (required by React)
  // But track if component is mounted to avoid SSR issues
  const nextPathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use Next.js pathname if component is mounted, otherwise use empty string to avoid hydration mismatch
  const currentPathname = mounted ? (nextPathname || (typeof window !== "undefined" ? window.location.pathname : "")) : "";

  // Update user roles if they change
  useEffect(() => {
    setUserRoles(roles);
  }, [roles]);

  // Load user roles from client if not provided (for backward compatibility)
  useEffect(() => {
    if (roles.length === 0) {
      const loadRoles = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
          if (data) {
            setUserRoles(data.map((r) => r.role) as UserRole[]);
          }
        }
      };
      loadRoles();
    }
  }, [roles, supabase]);

  // Set environment badge client-side only (to avoid hydration mismatch)
  useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
      setEnvBadge({ label: "Local", color: "bg-warning/10 text-warning border-warning/20" });
    } else if (hostname.includes("beta") || hostname.includes("staging")) {
      setEnvBadge({ label: "Beta", color: "bg-warning/10 text-warning border-warning/20" });
    } else {
      setEnvBadge({ label: "Production", color: "bg-success/10 text-success border-success/20" });
    }
  }, []);

  // Read impersonation from cookies (client-side only)
  useEffect(() => {
    console.log("[AppLayout] Reading impersonation cookies");
    console.log("[AppLayout] All cookies:", document.cookie);
    
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cs-impersonate-role="));
    
    const entityCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("cs-impersonate-entity-id="));

    console.log("[AppLayout] Role cookie string:", roleCookie);
    console.log("[AppLayout] Entity cookie string:", entityCookie);

    let role: UserRole | "all" | null = null;
    if (roleCookie) {
      const roleValue = roleCookie.split("=")[1];
      console.log("[AppLayout] Role value:", roleValue);
      if (roleValue === "all" || ["venue_admin", "event_organizer", "promoter", "attendee"].includes(roleValue)) {
        role = roleValue as UserRole | "all";
      }
    }
    if (!role) role = "all";

    const entityId = entityCookie ? entityCookie.split("=")[1] : null;
    console.log("[AppLayout] Final impersonation state:", { role, entityId });

    setImpersonation({ role, entityId });
  }, []);

  // Get filtered navigation items based on user roles or impersonated role
  const rolesForNavigation = impersonation.role && impersonation.role !== "all" 
    ? [impersonation.role] 
    : (userRoles as UserRole[]);
  const navItems = getNavItemsForUser(rolesForNavigation);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Format roles for display
  const formatRoles = (roles: string[]) => {
    if (roles.length === 0) return "User";
    if (roles.length === 1) return roles[0].replace(/_/g, " ");
    return `${roles.length} roles`;
  };

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
            <Link href="/app" className="flex items-center">
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
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = mounted && (currentPathname === item.href || currentPathname.startsWith(item.href + "/"));
              const IconComponent = item.icon;
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
                  <IconComponent className="h-5 w-5" />
                  {item.label}
                  {item.badge}
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
                    <p className="text-xs text-foreground-muted truncate">
                      {formatRoles(userRoles)}
                    </p>
                  </div>
                </div>
              }
              items={[
                {
                  label: "Profile & Settings",
                  onClick: () => setProfileModalOpen(true),
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
              {/* Entity Switcher for Superadmin - always show */}
              {userRoles.includes("superadmin") && (
                <EntitySwitcher userRoles={userRoles as UserRole[]} />
              )}
              
              {/* Notifications area - placeholder for future */}
              {envBadge && (
                <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border", envBadge.color)}>
                  {envBadge.label}
                </span>
              )}
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

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userEmail={userEmail}
        userRoles={userRoles}
      />
    </div>
  );
}

