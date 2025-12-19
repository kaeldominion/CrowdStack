"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LogOut } from "lucide-react";

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // Check roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id);

      if (userRoles) {
        setRoles(userRoles.map((r: any) => r.role));
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with logout */}
      <div className="mx-auto max-w-7xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
              <span className="text-[#3B82F6] font-semibold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.email}</p>
              <p className="text-sm text-white/60">
                {roles.length > 0 ? roles.join(", ") : "Attendee"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            My Dashboard
          </h1>
          
          <div className="mt-6 flex gap-4 justify-center flex-wrap">
            {(roles.includes("superadmin") || roles.includes("venue_admin") || roles.includes("event_organizer") || roles.includes("promoter")) && (
              <a
                href="/app"
                className="inline-flex items-center px-4 py-2 bg-[#3B82F6] text-white rounded-md hover:bg-[#3B82F6]/80 transition-colors"
              >
                Go to Dashboard
              </a>
            )}
            {roles.includes("superadmin") && (
              <a
                href="/admin"
                className="inline-flex items-center px-4 py-2 bg-[#EF4444] text-white rounded-md hover:bg-[#EF4444]/80 transition-colors"
              >
                Admin Panel
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">XP Points</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">Upcoming Events</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
          <div className="rounded-lg border border-[#2A2F3A] bg-[#141821] p-6">
            <h3 className="text-lg font-semibold text-white">Past Events</h3>
            <p className="mt-2 text-3xl font-bold text-[#3B82F6]">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
