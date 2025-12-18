import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer, Logo, Button } from "@crowdstack/ui";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrowdStack - Run events with data, not guesswork",
  description: "The operating system for modern events & venues. Track attendance, attribution, payouts, and performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0A0A0A] text-white antialiased`}>
        <div className="flex min-h-screen flex-col">
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
          <main className="flex-1 pt-20">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

