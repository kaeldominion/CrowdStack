"use client";

import { usePathname } from "next/navigation";
import { Footer, Logo } from "@crowdstack/ui";
import Link from "next/link";

// Routes that should show public navigation and footer
const publicRoutes = [
  "/",
  "/login",
  "/pricing",
  "/contact",
  "/legal",
  "/me", // Attendee dashboard
];

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

// Routes that should show navigation (public routes or event pages)
const shouldShowNav = (pathname: string) => {
  if (shouldHideNav(pathname)) return false;
  if (publicRoutes.includes(pathname)) return true;
  if (pathname.startsWith("/e/")) return true; // Event pages
  if (pathname.startsWith("/invite/")) return true; // Invite pages
  if (pathname.startsWith("/i/")) return true; // Invite code pages
  if (pathname.startsWith("/checkin/")) return true; // Check-in pages
  if (pathname.startsWith("/p/")) return true; // Photo pages
  return false;
};

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showNav = shouldShowNav(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showNav && <PublicNavigation />}
      <main className={showNav ? "flex-1 pt-20" : "flex-1"}>{children}</main>
      {showNav && <PublicFooter />}
    </div>
  );
}

function PublicNavigation() {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto">
      <div className="flex h-14 items-center gap-2 px-4 sm:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
        <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
          <Logo variant="full" size="sm" animated={false} className="text-white" />
        </Link>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="#features" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
            Features
          </Link>
          <Link href="#solutions" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap hidden sm:inline">
            Solutions
          </Link>
          <Link href="/pricing" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap">
            Pricing
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
      </div>
    </nav>
  );
}

function PublicFooter() {
  return <Footer />;
}

