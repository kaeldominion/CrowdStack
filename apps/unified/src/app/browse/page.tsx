"use client";

import { Card } from "@crowdstack/ui";
import { Compass, Calendar, MapPin, Search } from "lucide-react";

export default function BrowsePage() {
  return (
    <div className="min-h-screen px-4 py-6 md:py-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary mb-4">
          <Compass className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          Browse Events
        </h1>
        <p className="text-secondary text-sm md:text-base max-w-md mx-auto">
          Discover upcoming events, parties, and experiences near you
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="!rounded-2xl overflow-hidden">
        <div className="p-8 md:p-12 text-center">
          <div className="flex justify-center gap-4 mb-6 text-muted">
            <Calendar className="w-8 h-8" />
            <MapPin className="w-8 h-8" />
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-primary mb-3">
            Coming Soon
          </h2>
          <p className="text-secondary text-sm max-w-sm mx-auto leading-relaxed">
            We&apos;re building an amazing event discovery experience. 
            Soon you&apos;ll be able to browse events by venue, date, genre, and more.
          </p>
          <div className="mt-8 pt-6 border-t border-border-subtle">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
              Stay Tuned
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

