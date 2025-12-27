"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo, cn } from "@crowdstack/ui";
import { 
  Calendar, 
  LayoutGrid, 
  Users,
  Megaphone,
  CreditCard,
  Settings,
  User,
  Shield,
  LogOut,
  Sparkles,
  ChevronDown,
  MoreHorizontal,
  Compass,
  Layers,
  Building2,
  Mic2,
} from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  key?: string;
  exact?: boolean; // If true, only match exact pathname
}

interface ModeItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  role: string;
}

// Public nav items (logged out users) - Login button is separate with gradient styling
const PUBLIC_NAV_ITEMS: NavItem[] = [
  { href: "/browse", label: "Browse", icon: Compass },
];

// Additional nav item for landing page only
const FOR_BUSINESS_ITEM: NavItem = { href: "/for-business", label: "For Business", icon: Building2 };

// Attendee nav items (for /me routes) - ME | BROWSE | MODE
const ATTENDEE_NAV_ITEMS: NavItem[] = [
  { href: "/me", label: "Me", icon: User, exact: true },
  { href: "/browse", label: "Browse", icon: Compass },
];

// Mode dropdown items - role-based dashboards
const MODE_ITEMS: ModeItem[] = [
  { href: "/app/venue/events", label: "Venue", icon: Building2, role: "venue_admin" },
  { href: "/app/organizer/events", label: "Organizer", icon: Calendar, role: "event_organizer" },
  { href: "/app/promoter/events", label: "Promoter", icon: Mic2, role: "promoter" },
  { href: "/admin", label: "Admin", icon: Shield, role: "superadmin" },
];

// Admin nav items
const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/app", label: "App", icon: Sparkles },
];

export function DockNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();
  const profileRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; avatar_url?: string } | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) {
        setIsModeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check auth state and load roles
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setIsAuthenticated(true);
          
          // Load user profile
          const { data: attendee } = await supabase
            .from("attendees")
            .select("name, avatar_url")
            .eq("user_id", authUser.id)
            .single();
          
          setUser({
            name: attendee?.name || authUser.user_metadata?.name,
            email: authUser.email,
            avatar_url: attendee?.avatar_url,
          });
          
          // Load user roles
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authUser.id);
          if (roles) {
            setUserRoles(roles.map(r => r.role));
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session?.user);
      if (!session?.user) {
        setUserRoles([]);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Build nav items based on roles (for /app routes)
  const getAuthNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { href: "/app", label: "Dashboard", icon: LayoutGrid, exact: true },
    ];

    if (userRoles.includes("venue_admin") || userRoles.includes("superadmin")) {
      items.push({ href: "/app/venue/events", label: "Events", icon: Calendar });
      items.push({ href: "/app/venue/attendees", label: "Attendees", icon: Users });
      items.push({ href: "/app/venue/promoters", label: "Promoters", icon: Megaphone });
    } else if (userRoles.includes("event_organizer")) {
      items.push({ href: "/app/organizer/events", label: "Events", icon: Calendar });
      items.push({ href: "/app/organizer/attendees", label: "Attendees", icon: Users });
      items.push({ href: "/app/organizer/promoters", label: "Promoters", icon: Megaphone });
    } else if (userRoles.includes("promoter")) {
      items.push({ href: "/app/promoter/events", label: "Events", icon: Calendar });
      items.push({ href: "/app/promoter/earnings", label: "Earnings", icon: CreditCard });
    }

    if (userRoles.includes("superadmin")) {
      items.push({ href: "/admin", label: "Admin", icon: Shield });
    }

    return items;
  };

  // Get available mode items based on user roles
  const getAvailableModeItems = (): ModeItem[] => {
    return MODE_ITEMS.filter(item => 
      userRoles.includes(item.role) || userRoles.includes("superadmin")
    );
  };

  // Determine which nav items to show based on pathname
  const getNavItems = (): NavItem[] => {
    if (pathname?.startsWith("/admin")) return ADMIN_NAV_ITEMS;
    if (pathname?.startsWith("/app")) return getAuthNavItems();
    
    // For authenticated users: always show ME | BROWSE (no Home)
    if (isAuthenticated) {
      return ATTENDEE_NAV_ITEMS;
    }
    
    // On landing page, show "For Business" link for unauthenticated users
    if (pathname === "/" || pathname === "/for-business") {
      return [FOR_BUSINESS_ITEM, ...PUBLIC_NAV_ITEMS];
    }
    
    return PUBLIC_NAV_ITEMS;
  };

  const navItems = getNavItems();
  const availableModeItems = getAvailableModeItems();
  const showModeDropdown = isAuthenticated && availableModeItems.length > 0 && 
    (pathname?.startsWith("/me") || pathname?.startsWith("/browse") || 
     (!pathname?.startsWith("/admin") && !pathname?.startsWith("/app")));
  
  // Split items for mobile overflow (show 3 primary, rest in "More")
  const primaryItems = navItems.slice(0, 3);
  const secondaryItems = navItems.slice(3);
  const isOverflowActive = secondaryItems.some(item => 
    item.exact ? pathname === item.href : (pathname === item.href || pathname?.startsWith(`${item.href}/`))
  );

  // Check if item is active - FIXED: respect exact flag
  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname?.startsWith(`${item.href}/`);
  };

  // Handle logout
  const handleLogout = async () => {
    setIsProfileOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  // Get user initial for avatar fallback
  const getUserInitial = () => {
    if (user?.name) return user.name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  // Don't show on standalone/auth routes
  const isStandaloneRoute = 
    pathname?.startsWith("/auth/") ||
    pathname?.startsWith("/door") ||
    pathname?.startsWith("/scanner") ||
    pathname?.startsWith("/login");

  if (isStandaloneRoute) return null;
  if (isLoading) return null;

  // Profile menu items
  const profileMenuItems = [
    { href: "/me", label: "Profile", icon: User },
    { href: "/me/settings", label: "Settings", icon: Settings },
    { href: "/me/billing", label: "Billing", icon: CreditCard },
  ];

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4 font-sans">
      {/* Container for pill + separator + avatar */}
      <div className="flex items-center justify-center gap-2">
        {/* The Pill */}
        <nav className={cn(
          "flex items-center",
          "bg-void/90 backdrop-blur-xl",
          "border border-border-strong rounded-full",
          "py-2 px-3",
          "shadow-2xl shadow-void/50 ring-1 ring-border-subtle"
        )}>
          
          {/* Logo Section */}
          <div className="flex items-center gap-2 pr-3 border-r border-border-strong">
            <Link href={isAuthenticated ? "/app" : "/"} className="flex items-center gap-2 transition-transform hover:scale-105">
              <Logo variant="tricolor" size="sm" iconOnly className="sm:hidden" />
              <Logo variant="tricolor" size="sm" className="hidden sm:flex" />
            </Link>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-0.5 pl-2">
            {/* Primary Items - Always Visible */}
            {primaryItems.map((item, index) => {
              const isActive = isItemActive(item);
              
              return (
                <Link
                  key={item.key || `${item.href}-${index}`}
                  href={item.href}
                  className={cn(
                    "px-2.5 py-1 rounded-full",
                    "text-[10px] font-bold uppercase tracking-widest",
                    "transition-all whitespace-nowrap",
                    isActive
                      ? "bg-accent-secondary text-void shadow-lg"
                      : "text-secondary hover:text-white hover:bg-active/50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Secondary Items - Hidden on Mobile, Visible on Desktop */}
            {secondaryItems.map((item, index) => {
              const isActive = isItemActive(item);
              
              return (
                <Link
                  key={item.key || `${item.href}-secondary-${index}`}
                  href={item.href}
                  className={cn(
                    "hidden md:block px-2.5 py-1 rounded-full",
                    "text-[10px] font-bold uppercase tracking-widest",
                    "transition-all whitespace-nowrap",
                    isActive
                      ? "bg-accent-secondary text-void shadow-lg"
                      : "text-secondary hover:text-white hover:bg-active/50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* MODE Dropdown - Role-based dashboard access */}
            {showModeDropdown && (
              <div className="relative" ref={modeRef}>
                <button
                  onClick={() => setIsModeOpen(!isModeOpen)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full",
                    "text-[10px] font-bold uppercase tracking-widest",
                    "transition-all whitespace-nowrap",
                    isModeOpen || pathname?.startsWith("/app") || pathname?.startsWith("/admin")
                      ? "bg-accent-secondary text-void shadow-lg"
                      : "text-secondary hover:text-white hover:bg-active/50"
                  )}
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden sm:inline">Mode</span>
                  <ChevronDown className={cn(
                    "w-2.5 h-2.5 transition-transform",
                    isModeOpen && "rotate-180"
                  )} />
                </button>
                
                {/* Mode Dropdown Menu */}
                {isModeOpen && (
                  <div className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48",
                    "bg-glass border border-border-strong rounded-2xl p-2",
                    "shadow-2xl shadow-void/50 ring-1 ring-border-subtle backdrop-blur-xl"
                  )}>
                    <div className="px-3 py-2 border-b border-border-subtle mb-1">
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted">
                        Switch Dashboard
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {availableModeItems.map((item) => {
                        const Icon = item.icon;
                        // Check active based on base path (e.g., /app/venue not /app/venue/events)
                        const basePath = item.href.split('/').slice(0, 3).join('/');
                        const isActive = pathname?.startsWith(basePath);
                        
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsModeOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg",
                              "text-xs font-medium",
                              "transition-all",
                              isActive
                                ? "bg-accent-primary/20 text-accent-primary"
                                : "text-secondary hover:text-primary hover:bg-active/50"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* More Button - Mobile Only */}
            {secondaryItems.length > 0 && (
              <div className="relative md:hidden" ref={moreRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={cn(
                    "p-1 rounded-full transition-all",
                    isOverflowActive || isMoreOpen
                      ? "bg-accent-secondary text-void shadow-lg"
                      : "text-muted hover:text-primary hover:bg-active/50"
                  )}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                
                {/* Overflow Menu */}
                {isMoreOpen && (
                  <div className={cn(
                    "absolute top-full right-0 mt-3 w-40",
                    "bg-glass border border-border-strong rounded-2xl p-2",
                    "shadow-2xl shadow-void/50 ring-1 ring-border-subtle",
                    "flex flex-col gap-1"
                  )}>
                    {secondaryItems.map((item, index) => {
                      const isActive = isItemActive(item);
                      
                      return (
                        <Link
                          key={item.key || `${item.href}-overflow-${index}`}
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg",
                            "text-[10px] font-bold uppercase tracking-widest",
                            "transition-all",
                            isActive
                              ? "bg-active/60 text-primary"
                              : "text-secondary hover:text-primary hover:bg-active/50"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Login Button (inside pill for unauthenticated) */}
          {!isAuthenticated && (
            <div className="flex items-center pl-2 border-l border-border-strong ml-1">
              <Link
                href="/login"
                className={cn(
                  "px-3 py-1.5 rounded-full",
                  "bg-gradient-to-r from-accent-primary to-accent-secondary",
                  "text-white text-[10px] font-bold uppercase tracking-widest",
                  "transition-all hover:scale-105 hover:shadow-lg",
                  "shadow-md shadow-accent-primary/30"
                )}
              >
                Login
              </Link>
            </div>
          )}
        </nav>

        {/* Separator + User Profile Section - OUTSIDE the pill */}
        {isAuthenticated && (
          <>
            {/* Separator line matching the one inside the pill */}
            <div className="h-6 w-px bg-border-strong" />
            
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-0.5 hover:scale-105 transition-transform"
              >
              <div className="w-9 h-9 rounded-full bg-raised border-2 border-border-strong overflow-hidden relative shadow-lg">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-sm font-bold">
                    {getUserInitial()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-success rounded-full border-2 border-raised" />
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className={cn(
                "absolute top-full right-0 mt-3 w-56",
                "bg-glass border border-border-strong rounded-2xl p-2",
                "shadow-2xl shadow-void/50 ring-1 ring-border-subtle"
              )}>
                {/* User Info */}
                <div className="p-3 border-b border-border-subtle mb-1">
                  <p className="text-sm font-bold text-primary">{user?.name || "User"}</p>
                  <p className="text-[10px] text-muted font-mono">{user?.email}</p>
                </div>
                
                {/* Profile Links */}
                <div className="space-y-1">
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-secondary hover:text-primary hover:bg-active/50 rounded-lg transition-colors"
                      >
                        <Icon className="w-3 h-3" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
                
                {/* Sign Out */}
                <div className="mt-1 pt-1 border-t border-border-subtle">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-accent-error hover:bg-accent-error/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
