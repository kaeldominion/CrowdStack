"use client";

import { LoadingSpinner } from "@crowdstack/ui";

export default function VenuePageLoading() {
  return (
    <div className="min-h-screen bg-void">
      {/* Hero skeleton */}
      <div className="relative h-[50vh] bg-raised animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent" />
        
        {/* Content skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Logo skeleton */}
            <div className="h-20 w-20 bg-glass rounded-xl" />
            
            {/* Title skeleton */}
            <div className="h-8 w-64 bg-glass rounded-lg" />
            
            {/* Location skeleton */}
            <div className="h-5 w-40 bg-glass rounded" />
          </div>
        </div>
      </div>
      
      {/* Loading spinner overlay */}
      <div className="fixed inset-0 flex items-center justify-center bg-void/50 backdrop-blur-sm z-50">
        <LoadingSpinner size="lg" text="Loading venue..." />
      </div>
    </div>
  );
}

