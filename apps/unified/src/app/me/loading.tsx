"use client";

import { LoadingSpinner } from "@crowdstack/ui";

export default function MePageLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading your events..." />
    </div>
  );
}

