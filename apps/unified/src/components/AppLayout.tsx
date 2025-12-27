"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared";
import type { UserRole } from "@crowdstack/shared";
// Legacy navigation removed - DockNav is now the primary navigation
// import { WorkspaceNavigation } from "./WorkspaceNavigation";
import { DockNav } from "./navigation/DockNav";

interface AppLayoutProps {
  children: ReactNode;
  roles: UserRole[];
  userEmail?: string;
  userId?: string;
}

export function AppLayout({ children, roles, userEmail, userId }: AppLayoutProps) {
  const [userRoles, setUserRoles] = useState<string[]>(roles);
  const [mounted, setMounted] = useState(false);
  const supabase = createBrowserClient();

  const nextPathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPathname = mounted ? (nextPathname || (typeof window !== "undefined" ? window.location.pathname : "")) : "";

  // Check if this is a live mission control page (hide navigation)
  const isLivePage = currentPathname.includes("/live/");

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

  return (
    <div className="min-h-screen bg-void font-sans">
      {/* AI Studio atmosphere layers */}
      <div className="atmosphere-gradient" aria-hidden="true" />
      <div className="atmosphere-noise" aria-hidden="true" />
      
      {/* Page content - top padding for DockNav clearance */}
      <main className={cn(
        "min-h-screen relative z-10",
        !isLivePage && "pt-24 pb-8 px-4 lg:px-8"
      )}>
        {!isLivePage ? (
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        ) : (
          children
        )}
      </main>

      {/* DockNav - floating pill navigation (primary nav for /app routes) */}
      {!isLivePage && <DockNav />}
    </div>
  );
}

