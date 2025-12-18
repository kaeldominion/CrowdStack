import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@crowdstack/ui";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrowdStack Dashboard",
  description: "Manage your events, venues, and attendees",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <nav className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">
                  CrowdStack Dashboard
                </h1>
                <div className="flex gap-4">
                  <a
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/scanner"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Door Scanner
                  </a>
                  <a
                    href="/health"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Health
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

