"use client";

/**
 * Dynamic Chart Component Exports
 *
 * Charts are loaded dynamically to reduce initial bundle size.
 * Recharts is ~250KB, so lazy-loading charts significantly improves
 * page load performance for users who don't immediately need them.
 */

import dynamic from "next/dynamic";

// Loading skeleton for charts
const ChartSkeleton = () => (
  <div className="h-full w-full min-h-[200px] animate-pulse bg-raised rounded-lg flex items-center justify-center">
    <span className="text-secondary text-sm">Loading chart...</span>
  </div>
);

/**
 * Registration Chart - Shows registration trends over time
 * Used in: Organizer dashboard, Event detail pages
 */
export const RegistrationChart = dynamic(
  () => import("./RegistrationChart").then((mod) => mod.RegistrationChart),
  {
    ssr: false,
    loading: ChartSkeleton,
  }
);

/**
 * Check-ins Chart - Shows check-in activity during events
 * Used in: Event live dashboard, Door scanner view
 */
export const CheckinsChart = dynamic(
  () => import("./CheckinsChart").then((mod) => mod.CheckinsChart),
  {
    ssr: false,
    loading: ChartSkeleton,
  }
);

/**
 * Earnings Chart - Shows promoter earnings over time
 * Used in: Promoter dashboard
 */
export const EarningsChart = dynamic(
  () => import("./EarningsChart").then((mod) => mod.EarningsChart),
  {
    ssr: false,
    loading: ChartSkeleton,
  }
);
