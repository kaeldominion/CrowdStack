"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@crowdstack/ui";

// Static sample event for display purposes (browse feature hidden)
const SAMPLE_EVENT = {
  name: "SATURDAY NIGHT LIVE",
  date: "SAT 25 JAN • 22:00",
  venue: "@ EPIC CLUB, SHANGHAI",
  attending: 247,
  image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=800&fit=crop",
  badge: { text: "FEATURED", color: "purple" as const },
};

export function HeroEventCarousel({ events, loading }: { events: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="relative w-80 sm:w-96 rounded-2xl overflow-hidden border-2 border-white/30 bg-raised animate-pulse">
        <div className="aspect-[3/4] w-full" />
      </div>
    );
  }

  // Use static sample event instead of dynamic data
  const displayEvent = SAMPLE_EVENT;

  return (
    <div className="relative">
      {/* Main card - static, non-clickable */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-80 sm:w-96 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/50"
      >
        <div className="relative aspect-[3/4]">
          <Image
            src={displayEvent.image}
            alt={displayEvent.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 320px, 384px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />

          {/* Badge */}
          <div className="absolute top-5 left-5">
            <Badge color={displayEvent.badge.color} variant="solid" className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold">
              {displayEvent.badge.text}
            </Badge>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider mb-2">
              {displayEvent.date}
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
              {displayEvent.name}
            </h3>
            <p className="text-sm text-white/70 mb-5">
              {displayEvent.venue}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-accent-success font-medium">{displayEvent.attending} attending</span>
              <div className="px-5 py-2.5 bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-lg">
                Sample Event
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
