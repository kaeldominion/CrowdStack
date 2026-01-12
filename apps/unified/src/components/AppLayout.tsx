"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared";
import type { UserRole } from "@crowdstack/shared";
import { DockNav } from "./navigation/DockNav";
import { DashboardSidebar } from "./navigation/DashboardSidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

interface AppLayoutProps {
  children: ReactNode;
  roles: UserRole[];
  userEmail?: string;
  userId?: string;
}

function AppLayoutContent({ children, roles, userEmail, userId }: AppLayoutProps) {
  const [userRoles, setUserRoles] = useState<string[]>(roles);
  const [mounted, setMounted] = useState(false);
  const supabase = createBrowserClient();
  const { isCollapsed } = useSidebar();

  const nextPathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Check if we're on a dashboard route that needs sidebar
  const isDashboardRoute = currentPathname.startsWith("/app") || currentPathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-void font-sans">
      {/* AI Studio atmosphere layers */}
      <div className="atmosphere-gradient" aria-hidden="true" />
      <div className="atmosphere-noise" aria-hidden="true" />
      
      {/* Dashboard Sidebar - only shown on dashboard routes */}
      {isDashboardRoute && <DashboardSidebar />}
      
      {/* Page content - top padding for DockNav clearance, left padding for sidebar */}
      <main className={cn(
        "min-h-screen relative z-10 pt-24 pb-8 px-4 lg:px-8",
        "transition-all duration-300",
        isDashboardRoute && (isCollapsed ? "lg:pl-20" : "lg:pl-60") // Account for sidebar width (w-16 when collapsed, w-56 when expanded)
      )}>
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>

      {/* DockNav - floating pill navigation (primary nav for /app routes) */}
      <DockNav />
    </div>
  );
}

export function AppLayout({ children, roles, userEmail, userId }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent roles={roles} userEmail={userEmail} userId={userId}>
        {children}
      </AppLayoutContent>
    </SidebarProvider>
  );
}

