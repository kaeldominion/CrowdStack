"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@crowdstack/ui";

export function HeroEventCarousel({ events, loading }: { events: any[]; loading: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Transform events for hero carousel
  const heroEvents = events.length > 0 ? events.slice(0, 3).map((event) => {
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

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (heroEvents.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroEvents.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroEvents.length]);

  if (loading) {
    return (
      <div className="relative w-80 sm:w-96 rounded-2xl overflow-hidden border-2 border-white/30 bg-raised animate-pulse">
        <div className="aspect-[3/4] w-full" />
      </div>
    );
  }

  if (heroEvents.length === 0) {
    return null;
  }

  const currentEvent = heroEvents[currentIndex];

  return (
    <div className="relative">
      {/* Main card - larger size */}
      <Link href={`/e/${currentEvent.slug}`}>
        <motion.div
          key={currentEvent.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-80 sm:w-96 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl shadow-black/50 hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
        >
          <div className="relative aspect-[3/4]">
            <motion.div
              key={currentEvent.image}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-full h-full"
            >
              <Image
                src={currentEvent.image}
                alt={currentEvent.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 320px, 384px"
                priority
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
            
            {/* Badge */}
            <div className="absolute top-5 left-5">
              <Badge color={currentEvent.badge.color} variant="solid" className="!rounded-lg !px-3 !py-1.5 !text-xs !font-bold">
                {currentEvent.badge.color === "green" && (
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse inline-block" />
                )}
                {currentEvent.badge.text}
              </Badge>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <motion.div
                key={`content-${currentEvent.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <p className="font-mono text-sm font-medium text-accent-secondary tracking-wider mb-2">
                  {currentEvent.date}
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
                  {currentEvent.name}
                </h3>
                <p className="text-sm text-white/70 mb-5">
                  {currentEvent.venue}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-accent-success font-medium">{currentEvent.attending} attending</span>
                  <div className="px-5 py-2.5 bg-white text-void text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-accent-secondary hover:text-white transition-colors">
                    Join
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Carousel indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {heroEvents.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex 
                ? "bg-white w-6" 
                : "bg-white/40 w-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

