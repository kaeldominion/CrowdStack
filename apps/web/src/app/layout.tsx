import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "@crowdstack/ui";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrowdStack - Event Management Platform",
  description: "Manage events, check-in attendees, and capture memories",
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
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

