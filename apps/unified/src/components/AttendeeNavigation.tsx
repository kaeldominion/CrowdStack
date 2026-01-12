"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@crowdstack/ui";
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  QrCode,
  Radio,
} from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface UserData {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export function AttendeeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [djProfiles, setDjProfiles] = useState<Array<{ id: string; name: string; handle: string; profile_image_url: string | null }>>([]);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  // Fetch user's DJ profiles
  useEffect(() => {
    const fetchDJProfiles = async () => {
      if (!user?.id) {
        setDjProfiles([]);
        return;
      }
      try {
        const response = await fetch("/api/dj/profiles");
        if (response.ok) {
          const data = await response.json();
          setDjProfiles(data.profiles || []);
        } else {
          setDjProfiles([]);
        }
      } catch (error) {
        console.error("Error fetching DJ profiles:", error);
        setDjProfiles([]);
      }
    };
    fetchDJProfiles();
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadUser = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Try to get attendee name and avatar
        const { data: attendee } = await supabase
          .from("attendees")
          .select("name, avatar_url")
          .eq("user_id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || "",
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
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const navItems: Array<{ href: string; label: string; icon: any }> = [];

  const getProfileItems = () => {
    const items = [
      { href: "/me/profile", label: "Edit Profile", icon: User },
      { href: "/me/settings", label: "Settings", icon: Settings },
    ];

    // Add DJ profiles to menu
    if (djProfiles.length > 0) {
      djProfiles.forEach(dj => {
        items.push({ href: `/dj/${dj.handle}`, label: `DJ: ${dj.name}`, icon: Radio });
      });
    }
    
    // Always show "Create DJ Profile" option (users can have multiple)
    items.push({ href: "/dj/create", label: djProfiles.length > 0 ? "Add DJ Profile" : "Create DJ Profile", icon: Radio });

    return items;
  };

  const profileItems = getProfileItems();

  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 rounded-full border border-border-strong backdrop-blur-xl bg-glass/80 shadow-lg shadow-void/50">
        {/* Logo */}
        <Link href="/me" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
          <Logo variant="full" size="sm" animated={false} className="text-primary" />
        </Link>
        <div className="h-4 w-px bg-border-subtle hidden sm:block" />

        {/* Desktop Navigation */}
        {navItems.length > 0 && (
          <>
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-active text-primary"
                        : "text-secondary hover:text-primary hover:bg-active"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="h-4 w-px bg-border-subtle hidden sm:block" />
          </>
        )}

        {/* Desktop Profile Dropdown */}
        <div className="relative hidden sm:block" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-primary hover:text-primary hover:bg-active"
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
            <ChevronDown className={`h-3 w-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-border-strong backdrop-blur-xl bg-raised shadow-lg shadow-void/50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                    {getUserInitial()}
                  </div>
                )}
                <p className="text-xs text-muted truncate flex-1">{user?.email}</p>
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
                      className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {/* Sign Out */}
              <div className="border-t border-border-subtle py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-accent-error hover:text-accent-error/80 hover:bg-active transition-colors"
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
          className="sm:hidden ml-2 p-2 text-secondary hover:text-primary transition-colors"
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
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-lg border border-border-strong backdrop-blur-xl bg-raised shadow-lg shadow-void/50 z-50 sm:hidden overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
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
              <p className="text-xs text-muted truncate flex-1">{user?.email}</p>
            </div>

            {/* Navigation Links */}
            {navItems.length > 0 && (
              <>
                <div className="py-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "text-primary bg-active"
                            : "text-secondary hover:text-primary hover:bg-active"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                <div className="h-px bg-border-subtle" />
              </>
            )}

            {/* Profile Links */}
            <div className="py-2">
              {profileItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Sign Out */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-accent-error hover:text-accent-error/80 hover:bg-active transition-colors"
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

