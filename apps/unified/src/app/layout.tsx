import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "./conditional-layout";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ToastProvider } from "@crowdstack/ui";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "CrowdStack - Run events with data, not guesswork",
  description: "The operating system for modern events & venues. Track attendance, attribution, payouts, and performance.",
  icons: {
    icon: "/icon.svg?v=2",
    apple: "/apple-icon.svg?v=2",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Force dark mode on landing page (logged out)
                const isLandingPage = window.location.pathname === '/' || window.location.pathname === '';
                if (isLandingPage) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  const theme = localStorage.getItem('crowdstack-theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className} antialiased bg-void`}>
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <ImpersonationBanner />
              </Suspense>
              <Suspense fallback={null}>
                <NavigationProgress />
              </Suspense>
              <ConditionalLayout>{children}</ConditionalLayout>
              <Analytics />
              <SpeedInsights />
            </ToastProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
