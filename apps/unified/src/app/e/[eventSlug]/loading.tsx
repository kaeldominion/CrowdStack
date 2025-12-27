"use client";

import { LoadingSpinner } from "@crowdstack/ui";

export default function EventPageLoading() {
  return (
    <div className="min-h-screen bg-void">
      {/* Hero skeleton */}
      <div className="relative h-[60vh] md:h-[70vh] bg-raised animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/80 to-transparent" />
        
        {/* Content skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Badge skeleton */}
            <div className="h-6 w-24 bg-glass rounded-full" />
            
            {/* Title skeleton */}
            <div className="h-10 w-3/4 bg-glass rounded-lg" />
            
            {/* Venue skeleton */}
            <div className="h-5 w-48 bg-glass rounded" />
            
            {/* Date skeleton */}
            <div className="h-5 w-36 bg-glass rounded" />
          </div>
        </div>
      </div>
      
      {/* Loading spinner overlay */}
      <div className="fixed inset-0 flex items-center justify-center bg-void/50 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-secondary animate-pulse">Loading event...</p>
        </div>
      </div>
    </div>
  );
}

