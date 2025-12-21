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
    <div className="min-h-screen bg-[#0B0D10]">
      {/* Navigation Bar */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto sm:top-4">
        <div className="flex h-12 sm:h-14 items-center gap-2 px-3 sm:px-4 md:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
          {/* Logo */}
          <Link href="/door" className="flex items-center transition-all duration-300 hover:scale-105 pr-1 sm:pr-2">
            <Logo variant="full" size="sm" animated={false} className="text-white" />
          </Link>

          <div className="h-4 w-px bg-white/20" />

          {/* Door Scanner Label */}
          <span className="text-xs sm:text-sm font-medium text-white/80 px-2">
            Door Scanner
          </span>

          <div className="h-4 w-px bg-white/20" />

          {/* Dashboard Link (if has access) */}
          {hasDashboardAccess && (
            <>
              <Link
                href="/app"
                className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm text-white/60 hover:text-white transition-colors px-2"
              >
                <Home className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <div className="h-4 w-px bg-white/20 hidden sm:block" />
            </>
          )}

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-white/80 hover:text-white hover:bg-white/5"
            >
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  getUserInitial()
                )}
              </div>
              <span className="hidden sm:inline max-w-20 truncate text-xs">{getDisplayName()}</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 overflow-hidden">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-medium text-white truncate">
                    {userName || "Guest"}
                  </p>
                  <p className="text-xs text-white/50 truncate">{userEmail}</p>
                </div>

                {/* Links */}
                <div className="py-1">
                  {hasDashboardAccess && (
                    <Link
                      href="/app"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors sm:hidden"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Link>
                  )}
                  <Link
                    href="/me"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    My Events
                  </Link>
                  <Link
                    href="/me/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/me/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
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
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}

