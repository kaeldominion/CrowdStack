"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@crowdstack/ui";

export function MobileEventCarousel({ events, loading }: { events: any[]; loading: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Transform events for mobile carousel
  const mobileEvents = events.length > 0 ? events.slice(0, 3).map((event) => {
    const now = new Date();
    const isLive = event.date.includes("TONIGHT");
    const spotsLeft = event.spotsLeft || 0;
    
    return {
      id: event.id,
      slug: event.slug,
      name: event.name.toUpperCase(),
      date: `${event.date} • ${event.time}`,
      venue: `@ ${event.venue}${event.city ? `, ${event.city}` : ""}`,
      attending: event.capacity - spotsLeft,
      image: event.image,
      badge: isLive 
        ? { text: "LIVE NOW", color: "green" as const }
        : spotsLeft <= 20
        ? { text: "SELLING FAST", color: "purple" as const }
        : { text: "FEATURED", color: "blue" as const },
    };
  }) : [];

  // Handle scroll to detect active card
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const cardWidth = containerRef.current.offsetWidth;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, events.length - 1));
  };

  if (loading) {
    return (
      <section className="lg:hidden bg-void py-8">
        <div className="h-[400px] bg-raised animate-pulse" />
      </section>
    );
  }

  if (mobileEvents.length === 0) {
    return null;
  }

  return (
    <section className="lg:hidden bg-void py-8">
      {/* Section Header */}
      <div className="px-6 mb-6">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-2 block">
          Happening Now
        </span>
        <h2 className="text-2xl font-black text-white">Featured Events</h2>
      </div>

      {/* Scroll-snap container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 gap-4 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {mobileEvents.map((event, index) => (
          <div 
            key={event.id}
            className="snap-center shrink-0 w-[85vw] max-w-[340px]"
          >
            <Link href={`/e/${event.slug}`}>
              <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl cursor-pointer">
                <div className="relative aspect-[3/4]">
                  <Image
                    src={event.image}
                    alt={event.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 85vw, 340px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge 
                      color={event.badge.color} 
                      variant="solid" 
                      className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold"
                    >
                      {event.badge.color === "green" && (
                        <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse inline-block" />
                      )}
                      {event.badge.text}
                    </Badge>
                  </div>
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider mb-2">
                      {event.date}
                    </p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                      {event.name}
                    </h3>
                    <p className="text-sm text-white/70 mb-4">
                      {event.venue}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-accent-success font-medium">{event.attending} attending</span>
                      <div className="px-5 py-2.5 bg-white text-void text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-accent-secondary hover:text-white transition-colors">
                        Join
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {mobileEvents.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex 
                ? "bg-white w-6" 
                : "bg-white/30 w-2"
            }`}
          />
        ))}
      </div>

      {/* Swipe hint */}
      <p className="text-center text-white/40 text-xs font-mono uppercase tracking-widest mt-4">
        Swipe to explore
      </p>
    </section>
  );
}

