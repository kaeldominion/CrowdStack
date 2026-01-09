"use client";

import Image from "next/image";
import { Badge } from "@crowdstack/ui";

// Static sample events for display purposes (browse feature hidden)
const SAMPLE_EVENTS = [
  {
    id: "1",
    name: "SATURDAY NIGHT LIVE",
    date: "SAT 25 JAN • 22:00",
    venue: "@ EPIC CLUB, SHANGHAI",
    attending: 247,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
    badge: { text: "FEATURED", color: "purple" as const },
  },
  {
    id: "2",
    name: "UNDERGROUND BEATS",
    date: "FRI 24 JAN • 23:00",
    venue: "@ THE WAREHOUSE, BALI",
    attending: 156,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=800&fit=crop",
    badge: { text: "FEATURED", color: "blue" as const },
  },
];

export function MobileEventCarousel({ events, loading }: { events: any[]; loading: boolean }) {
  if (loading) {
    return (
      <section className="lg:hidden bg-void py-8">
        <div className="h-[400px] bg-raised animate-pulse" />
      </section>
    );
  }

  // Use static sample events instead of dynamic data
  const displayEvents = SAMPLE_EVENTS;

  return (
    <section className="lg:hidden bg-void py-8">
      {/* Section Header */}
      <div className="px-6 mb-6">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-2 block">
          Example Events
        </span>
        <h2 className="text-2xl font-black text-white">How It Looks</h2>
      </div>

      {/* Scroll-snap container - static, non-clickable */}
      <div
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 gap-4 pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayEvents.map((event) => (
          <div
            key={event.id}
            className="snap-center shrink-0 w-[85vw] max-w-[340px]"
          >
            {/* Non-clickable card */}
            <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-xl">
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
                    <div className="px-5 py-2.5 bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-lg">
                      Sample
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {displayEvents.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === 0 ? "bg-white w-6" : "bg-white/30 w-2"
            }`}
          />
        ))}
      </div>

      {/* Swipe hint */}
      <p className="text-center text-white/40 text-xs font-mono uppercase tracking-widest mt-4">
        Swipe to see more
      </p>
    </section>
  );
}
