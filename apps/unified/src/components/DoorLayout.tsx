"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@crowdstack/ui";
import { ChevronDown, LogOut, User, Settings, Calendar, Home } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface DoorLayoutProps {
  children: ReactNode;
  userEmail?: string;
  userId?: string;
  userRoles?: string[];
}

export function DoorLayout({ children, userEmail, userId, userRoles = [] }: DoorLayoutProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("attendees")
            .select("avatar_url, name")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            setAvatarUrl(profile.avatar_url);
            setUserName(profile.name);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfile();
  }, [supabase]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const getUserInitial = () => {
    if (userName) return userName[0].toUpperCase();
    if (userEmail) return userEmail[0].toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (userName) return userName;
    if (userEmail) return userEmail.split("@")[0];
    return "User";
  };

  // Check if user has B2B roles to show dashboard link
  const hasDashboardAccess = userRoles.some((role) =>
    ["venue_admin", "event_organizer", "promoter", "superadmin"].includes(role)
  );

  return (
    <div className="min-h-screen bg-void">
      {/* Navigation Bar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6 rounded-full border border-border-strong backdrop-blur-xl bg-glass shadow-2xl shadow-void/50">
          {/* Logo */}
          <Link href="/door" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
            <Logo variant="tricolor" size="sm" />
          </Link>

          <div className="h-4 w-px bg-border-strong" />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full transition-all duration-300 hover:bg-active"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getUserInitial()
                )}
              </div>
              <ChevronDown className={`h-3 w-3 text-secondary transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-3 w-56 rounded-2xl border border-border-strong backdrop-blur-xl bg-glass shadow-2xl shadow-void/50 overflow-hidden">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border-subtle">
                  <p className="text-sm font-bold text-primary truncate">
                    {userName || "Guest"}
                  </p>
                  <p className="text-[10px] text-muted font-mono truncate">{userEmail}</p>
                </div>

                {/* Links */}
                <div className="py-1">
                  <Link
                    href="/me"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Me
                  </Link>
                  {hasDashboardAccess && (
                    <Link
                      href="/app"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Link>
                  )}
                  <Link
                    href="/me/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/me/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="border-t border-border-subtle py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-accent-error hover:bg-accent-error/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-8 px-4 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}

