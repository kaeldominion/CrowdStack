"use client";

import { LoadingSpinner } from "@crowdstack/ui";

export default function BrowsePageLoading() {
  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:py-12">
        {/* Header skeleton */}
        <div className="text-center mb-8 md:mb-12">
          <div className="h-10 w-48 bg-glass rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-64 bg-glass rounded mx-auto animate-pulse" />
        </div>
        
        {/* Loading spinner */}
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading events..." />
        </div>
      </div>
    </div>
  );
}

