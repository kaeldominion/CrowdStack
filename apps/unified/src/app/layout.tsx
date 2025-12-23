import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "./conditional-layout";
import { Analytics } from "@vercel/analytics/next";
import { CrispChat } from "@/components/CrispChat";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-[#0B0D10] text-white antialiased`}>
        <ConditionalLayout>{children}</ConditionalLayout>
        <Analytics />
        <CrispChat />
      </body>
    </html>
  );
}

