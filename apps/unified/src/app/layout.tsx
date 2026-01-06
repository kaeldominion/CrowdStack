import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "./conditional-layout";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CrispChat } from "@/components/CrispChat";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { ToastProvider } from "@crowdstack/ui";
import { QueryProvider } from "@/components/QueryProvider";

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
});

export const metadata: Metadata = {
  title: "CrowdStack - Run events with data, not guesswork",
  description: "The operating system for modern events & venues. Track attendance, attribution, payouts, and performance.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-void">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className} antialiased bg-void`}>
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
            <CrispChat />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
