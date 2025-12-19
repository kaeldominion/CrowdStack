"use client";

// Re-export AppLayout as DashboardLayout for backward compatibility
// This allows existing code that imports DashboardLayout to continue working
export { AppLayout as DashboardLayout } from "./AppLayout";

// Legacy wrapper for single-role usage (for backward compatibility)
import { AppLayout } from "./AppLayout";
import type { ReactNode } from "react";
import type { UserRole } from "@crowdstack/shared";

interface LegacyDashboardLayoutProps {
  children: ReactNode;
  role: "venue_admin" | "event_organizer" | "promoter" | "superadmin";
  userEmail?: string;
}

/**
 * @deprecated Use AppLayout directly with roles array instead.
 * This wrapper is kept for backward compatibility with pages that haven't been updated yet.
 */
export function LegacyDashboardLayout({ children, role, userEmail }: LegacyDashboardLayoutProps) {
  return (
    <AppLayout roles={[role]} userEmail={userEmail}>
      {children}
    </AppLayout>
  );
}
