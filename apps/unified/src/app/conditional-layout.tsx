"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Footer, Logo } from "@crowdstack/ui";
import Link from "next/link";
import { Menu, X, User, Settings, LogOut, ChevronDown, LayoutGrid, Radio } from "lucide-react";
import { AttendeeNavigation } from "@/components/AttendeeNavigation";
import { DockNav } from "@/components/navigation/DockNav";
import { createBrowserClient } from "@crowdstack/shared";

// Routes that should show public navigation and footer (marketing pages)
const publicMarketingRoutes = [
  "/",
  "/for-business",
  "/contact",
  "/legal",
];

// Auth routes that are standalone (no nav, no footer)
const authRoutes = [
  "/login",
  "/auth/callback",
  "/auth/reset-password",
  "/auth/magic",
  "/auth/forgot-password",
];

// Routes that should show attendee navigation (logged-in user pages)
const isAttendeeRoute = (pathname: string) => {
  return pathname.startsWith("/me");
};

// Routes that should NOT show navigation/footer (admin, app, door routes)
const shouldHideNav = (pathname: string) => {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/door") ||
    pathname.startsWith("/scanner") ||
    pathname.startsWith("/dashboard")
  );
};

// Routes that are standalone (no nav, no footer) - self-contained experiences
const isStandaloneRoute = (pathname: string) => {
  // Auth routes are standalone
  if (authRoutes.includes(pathname)) return true;
  // Event registration and pass pages are standalone mobile-first experiences
  if (pathname.match(/^\/e\/[^/]+\/register/)) return true; // /e/[slug]/register
  if (pathname.match(/^\/e\/[^/]+\/pass/)) return true; // /e/[slug]/pass
  // Door scanner is always standalone
  if (pathname.startsWith("/door")) return true;
  // Invite code pages (QR code registration) have their own layout
  if (pathname.startsWith("/i/")) return true;
  // Invite token signup pages
  if (pathname.match(/^\/invite\/[^/]+\/signup/)) return true;
  return false;
};

// Routes that should show public marketing navigation (full marketing nav)
const shouldShowMarketingNav = (pathname: string) => {
  if (shouldHideNav(pathname)) return false;
  if (isAttendeeRoute(pathname)) return false;
  if (isStandaloneRoute(pathname)) return false;
  return publicMarketingRoutes.includes(pathname);
};

// Routes that should show simple public navigation (event pages, venue pages, etc.)
const shouldShowSimpleNav = (pathname: string) => {
  if (shouldHideNav(pathname)) return false;
  if (isAttendeeRoute(pathname)) return false;
  if (isStandaloneRoute(pathname)) return false;
  if (pathname.startsWith("/e/")) return true; // Event landing pages (not register/pass)
  if (pathname.startsWith("/v/")) return true; // Venue profile pages
  if (pathname.startsWith("/invite/") && !pathname.includes("/signup")) return true; // Invite pages (not signup)
  if (pathname.startsWith("/checkin/")) return true; // Check-in pages
  if (pathname.startsWith("/p/")) return true; // Photo gallery pages
  return false;
};

// Routes that should show public navigation (either marketing or simple)
const shouldShowPublicNav = (pathname: string) => {
  return shouldShowMarketingNav(pathname) || shouldShowSimpleNav(pathname);
};

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showMarketingNav = shouldShowMarketingNav(pathname);
  const showSimpleNav = shouldShowSimpleNav(pathname);
  const showAttendeeNav = isAttendeeRoute(pathname);
  const showFooter = showMarketingNav; // Only show footer on marketing pages (not event pages)

  // Event pages and photo pages handle their own layout (fixed backgrounds, etc.)
  // They should not have any padding from the conditional layout
  const isEventPage = pathname.startsWith("/e/") && !pathname.includes("/register") && !pathname.includes("/pass");
  const isPhotoPage = pathname.startsWith("/p/");
  const isPromoterPage = pathname.startsWith("/promoter/"); // Promoter profile pages have full-bleed gradient
  const isMePage = pathname === "/me"; // ME page has hero gradient that needs to extend behind nav
  const isLandingPage = pathname === "/" || pathname === "/for-business"; // Landing pages have their own BETA banner
  const isContentPage = pathname === "/faq" || pathname === "/contact"; // Content pages handle their own layout
  const handlesOwnLayout = isEventPage || isPhotoPage || isPromoterPage || isMePage || isLandingPage || isContentPage;
  
  // Pages that handle own layout: no padding (they manage nav clearance themselves)
  // Routes that have their own nested layouts with DockNav (don't render DockNav here)
  const hasNestedLayoutNav = shouldHideNav(pathname); // /app, /admin, /door, /scanner have their own layouts
  
  // Add top padding for DockNav clearance (nav is now at top)
  const shouldAddTopPadding = !isStandaloneRoute(pathname) && !hasNestedLayoutNav && !handlesOwnLayout;
  const topPadding = shouldAddTopPadding ? "pt-20" : "";
  
  // DockNav is now at top, so we need top padding instead of bottom
  const mainPaddingClass = `flex-1 ${topPadding}`;

  return (
    <div className="flex min-h-screen flex-col font-sans bg-void">
      {/* AI Studio atmosphere layers */}
      <div className="atmosphere-gradient" aria-hidden="true" />
      <div className="atmosphere-noise" aria-hidden="true" />
      
      {/* Legacy top navigation disabled - DockNav is now the primary navigation */}
      {/* {showMarketingNav && <PublicNavigation variant="marketing" />} */}
      {/* {showSimpleNav && <PublicNavigation variant="simple" />} */}
      {/* {showAttendeeNav && <AttendeeNavigation />} */}
      <main className={`${mainPaddingClass} relative z-10`}>
        {children}
      </main>
      {showFooter && <PublicFooter />}
      {/* Only show DockNav for routes that don't have nested layouts AND are not standalone experiences */}
      {!hasNestedLayoutNav && !isStandaloneRoute(pathname) && <DockNav />}
    </div>
  );
}

function PublicNavigation({ variant = "marketing", showForBusiness = false }: { variant?: "marketing" | "simple"; showForBusiness?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 rounded-full border border-border-strong backdrop-blur-xl bg-glass/80 shadow-lg shadow-void/50">
        <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
          <Logo variant="full" size="sm" animated={false} className="text-primary" />
        </Link>
        
        {variant === "marketing" ? (
          <>
            <div className="h-4 w-px bg-border-subtle hidden sm:block" />
            
            {/* Desktop Marketing Navigation */}
            <div className="hidden sm:flex items-center gap-4 sm:gap-6">
              {showForBusiness && (
                <Link href="/for-business" className="text-xs sm:text-sm text-secondary hover:text-primary transition-all duration-300 whitespace-nowrap">
                  For Business
                </Link>
              )}
              <Link href="/login" className="text-xs sm:text-sm text-secondary hover:text-primary transition-all duration-300 whitespace-nowrap">
                Log in
              </Link>
              <div className="h-4 w-px bg-border-subtle" />
              <Link href="/contact">
                <button className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 whitespace-nowrap">
                  Book a demo
                </button>
              </Link>
            </div>

            {/* Mobile Marketing Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="sm:hidden ml-2 p-2 text-secondary hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile Marketing Menu Dropdown */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 sm:hidden"
                  onClick={() => setIsOpen(false)}
                  onTouchEnd={(e) => { e.preventDefault(); setIsOpen(false); }}
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-border-strong backdrop-blur-xl bg-raised shadow-lg shadow-void/50 z-50 sm:hidden">
                  <div className="flex flex-col py-2">
                    {showForBusiness && (
                      <Link
                        href="/for-business"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                      >
                        For Business
                      </Link>
                    )}
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                    >
                      Log in
                    </Link>
                    <div className="h-px bg-border-subtle my-2" />
                    <Link
                      href="/contact"
                      onClick={() => setIsOpen(false)}
                      className="mx-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-center transition-all duration-300 hover:scale-105"
                    >
                      Book a demo
                    </Link>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Simple Navigation - logo and auth-aware content */}
            <div className="h-4 w-px bg-border-subtle hidden sm:block" />
            <PublicNavigationWithAuth />
            
            {/* Mobile Menu Button for Simple Nav */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden ml-2 p-2 text-secondary hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            {/* Mobile Menu Dropdown for Simple Nav */}
            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 sm:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                  onTouchEnd={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }}
                  style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-border-strong backdrop-blur-xl bg-raised shadow-lg shadow-void/50 z-50 sm:hidden">
                  <PublicNavigationWithAuthMobile onClose={() => setIsMobileMenuOpen(false)} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

function PublicNavigationWithAuth() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [djProfiles, setDjProfiles] = useState<Array<{ id: string; name: string; handle: string; profile_image_url: string | null }>>([]);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Shared user loading logic
    const loadUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error getting user:", error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (authUser) {
          // Try to get attendee name
          const { data: attendee } = await supabase
            .from("attendees")
            .select("name")
            .eq("user_id", authUser.id)
            .single();

          // Get user roles to check dashboard access
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id);

          const roleList = (roles || []).map((r: any) => r.role);
          setUserRoles(roleList);

          setUser({
            id: authUser.id,
            email: authUser.email || "",
            name: attendee?.name || authUser.user_metadata?.name,
          });
        } else {
          setUser(null);
          setUserRoles([]);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setUser(null);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Listen for auth state changes
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadUser();
      }
      // Note: We skip TOKEN_REFRESHED to avoid unnecessary reloads
    });

    return () => {
      subscription.unsubscribe();
    };
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

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push("/");
  };

  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  // Build profile items - add dashboard if user has access
  const hasDashboardAccess = userRoles.some(role => 
    ["venue_admin", "event_organizer", "promoter", "superadmin"].includes(role)
  );
  
  const profileItems = [];
  if (hasDashboardAccess) {
    profileItems.push({ href: "/app", label: "Dashboard", icon: LayoutGrid });
  }
  profileItems.push(
    { href: "/me", label: "Me", icon: User },
    { href: "/me/profile", label: "Profile", icon: Settings }
  );

  // Add DJ profiles to menu
  if (djProfiles.length > 0) {
    djProfiles.forEach(dj => {
      profileItems.push({ href: `/dj/${dj.handle}`, label: `DJ: ${dj.name}`, icon: Radio });
    });
  }
  
  // Always show "Create DJ Profile" option (users can have multiple)
  profileItems.push({ href: "/dj/create", label: djProfiles.length > 0 ? "Add DJ Profile" : "Create DJ Profile", icon: Radio });

  // Show loading state (simple "Log in" link while checking)
  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-4">
        <Link href="/login" className="text-xs sm:text-sm text-secondary hover:text-primary transition-all duration-300 whitespace-nowrap">
          Log in
        </Link>
      </div>
    );
  }

  // Show profile dropdown if logged in
  if (user) {
    return (
      <div className="hidden sm:flex items-center gap-4">
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-primary hover:text-primary hover:bg-active"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {getUserInitial()}
            </div>
            <ChevronDown className={`h-3 w-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-border-strong backdrop-blur-xl bg-raised shadow-lg shadow-void/50 overflow-hidden z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-sm font-medium text-primary truncate">
                  {user.name || "Guest"}
                </p>
                <p className="text-xs text-muted truncate">{user.email}</p>
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
      </div>
    );
  }

  // Show "Log in" link if not logged in
  return (
    <div className="hidden sm:flex items-center gap-4">
      <Link href="/login" className="text-xs sm:text-sm text-secondary hover:text-primary transition-all duration-300 whitespace-nowrap">
        Log in
      </Link>
    </div>
  );
}

function PublicNavigationWithAuthMobile({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [djProfiles, setDjProfiles] = useState<Array<{ id: string; name: string; handle: string; profile_image_url: string | null }>>([]);

  useEffect(() => {
    // Shared user loading logic
    const loadUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("Error getting user:", error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (authUser) {
          // Try to get attendee name
          const { data: attendee } = await supabase
            .from("attendees")
            .select("name")
            .eq("user_id", authUser.id)
            .single();

          // Get user roles to check dashboard access
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id);

          const roleList = (roles || []).map((r: any) => r.role);
          setUserRoles(roleList);

          setUser({
            id: authUser.id,
            email: authUser.email || "",
            name: attendee?.name || authUser.user_metadata?.name,
          });
        } else {
          setUser(null);
          setUserRoles([]);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setUser(null);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Listen for auth state changes
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadUser();
      }
      // Note: We skip TOKEN_REFRESHED to avoid unnecessary reloads
    });

    return () => {
      subscription.unsubscribe();
    };
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

  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  };

  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  // Build profile items - add dashboard if user has access
  const hasDashboardAccess = userRoles.some(role => 
    ["venue_admin", "event_organizer", "promoter", "superadmin"].includes(role)
  );
  
  const profileItems = [];
  if (hasDashboardAccess) {
    profileItems.push({ href: "/app", label: "Dashboard", icon: LayoutGrid });
  }
  profileItems.push(
    { href: "/me", label: "Me", icon: User },
    { href: "/me/profile", label: "Profile", icon: Settings }
  );

  // Add DJ profiles to menu
  if (djProfiles.length > 0) {
    djProfiles.forEach(dj => {
      profileItems.push({ href: `/dj/${dj.handle}`, label: `DJ: ${dj.name}`, icon: Radio });
    });
  }
  
  // Always show "Create DJ Profile" option (users can have multiple)
  profileItems.push({ href: "/dj/create", label: djProfiles.length > 0 ? "Add DJ Profile" : "Create DJ Profile", icon: Radio });

  if (loading) {
    return (
      <div className="flex flex-col py-2">
        <Link
          href="/login"
          onClick={onClose}
          className="px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col">
        {/* User Info */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {getUserInitial()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">
              {user.name || "Guest"}
            </p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
        </div>

        {/* Profile Links */}
        <div className="py-2">
          {profileItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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
              onClose();
              handleLogout();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-accent-error hover:text-accent-error/80 hover:bg-active transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-2">
      <Link
        href="/login"
        onClick={onClose}
        className="px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
      >
        Log in
      </Link>
    </div>
  );
}

function PublicFooter() {
  return <Footer />;
}
