"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Footer, Logo } from "@crowdstack/ui";
import Link from "next/link";
import { Menu, X, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { AttendeeNavigation } from "@/components/AttendeeNavigation";
import { createBrowserClient } from "@crowdstack/shared";

// Routes that should show public navigation and footer (marketing pages)
const publicMarketingRoutes = [
  "/",
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
  if (pathname.startsWith("/invite/")) return true; // Invite pages
  if (pathname.startsWith("/i/")) return true; // Invite code pages
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
  const handlesOwnLayout = isEventPage || isPhotoPage;
  
  // Pages that handle own layout: no padding (they manage nav clearance themselves)
  // Other pages with nav: add pt-20 padding for nav bar clearance
  const mainPaddingClass = handlesOwnLayout 
    ? "flex-1" // No padding - page handles its own layout
    : (showMarketingNav || showSimpleNav || showAttendeeNav) 
      ? "flex-1 pt-20" 
      : "flex-1";

  return (
    <div className="flex min-h-screen flex-col">
      {showMarketingNav && <PublicNavigation variant="marketing" />}
      {showSimpleNav && <PublicNavigation variant="simple" />}
      {showAttendeeNav && <AttendeeNavigation />}
      <main className={mainPaddingClass}>
        {children}
      </main>
      {showFooter && <PublicFooter />}
    </div>
  );
}

function PublicNavigation({ variant = "marketing" }: { variant?: "marketing" | "simple" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
        <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
          <Logo variant="full" size="sm" animated={false} className="text-white" />
        </Link>
        
        {variant === "marketing" ? (
          <>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            
            {/* Desktop Marketing Navigation */}
            <div className="hidden sm:flex items-center gap-4 sm:gap-6">
              <Link href="#features" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
                Features
              </Link>
              <Link href="#solutions" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
                Solutions
              </Link>
              <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
                Log in
              </Link>
              <div className="h-4 w-px bg-white/20" />
              <Link href="/contact">
                <button className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 whitespace-nowrap">
                  Book a demo
                </button>
              </Link>
            </div>

            {/* Mobile Marketing Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="sm:hidden ml-2 p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile Marketing Menu Dropdown */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 z-50 sm:hidden">
                  <div className="flex flex-col py-2">
                    <Link
                      href="#features"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="#solutions"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Solutions
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Log in
                    </Link>
                    <div className="h-px bg-white/20 my-2" />
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
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <PublicNavigationWithAuth />
            
            {/* Mobile Menu Button for Simple Nav */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden ml-2 p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            {/* Mobile Menu Dropdown for Simple Nav */}
            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 z-50 sm:hidden">
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
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Shared user loading logic
  const loadUser = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Try to get attendee name
        const { data: attendee } = await supabase
          .from("attendees")
          .select("name")
          .eq("user_id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          name: attendee?.name || authUser.user_metadata?.name,
        });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const profileItems = [
    { href: "/me", label: "My Events", icon: User },
    { href: "/me/profile", label: "Profile", icon: Settings },
  ];

  // Show loading state (simple "Log in" link while checking)
  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-4">
        <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
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
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-white/80 hover:text-white hover:bg-white/5"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {getUserInitial()}
            </div>
            <span className="hidden lg:inline max-w-24 truncate">{getDisplayName()}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 overflow-hidden z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || "Guest"}
                </p>
                <p className="text-xs text-white/50 truncate">{user.email}</p>
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
      </div>
    );
  }

  // Show "Log in" link if not logged in
  return (
    <div className="hidden sm:flex items-center gap-4">
      <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
        Log in
      </Link>
    </div>
  );
}

function PublicNavigationWithAuthMobile({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Try to get attendee name
        const { data: attendee } = await supabase
          .from("attendees")
          .select("name")
          .eq("user_id", authUser.id)
          .single();

        setUser({
          id: authUser.id,
          email: authUser.email || "",
          name: attendee?.name || authUser.user_metadata?.name,
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
    onClose();
    router.push("/");
  };

  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const profileItems = [
    { href: "/me", label: "My Events", icon: User },
    { href: "/me/profile", label: "Profile", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex flex-col py-2">
        <Link
          href="/login"
          onClick={onClose}
          className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
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
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {getUserInitial()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user.name || "Guest"}
            </p>
            <p className="text-xs text-white/50 truncate">{user.email}</p>
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
              onClose();
              handleLogout();
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
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
        className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
      >
        Log in
      </Link>
    </div>
  );
}

function PublicFooter() {
  return <Footer />;
}
