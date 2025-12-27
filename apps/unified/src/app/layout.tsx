import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "./conditional-layout";
import { Analytics } from "@vercel/analytics/next";
import { CrispChat } from "@/components/CrispChat";
import { NavigationProgress } from "@/components/NavigationProgress";

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${inter.className} antialiased`}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ConditionalLayout>{children}</ConditionalLayout>
        <Analytics />
        <CrispChat />
      </body>
    </html>
  );
}

