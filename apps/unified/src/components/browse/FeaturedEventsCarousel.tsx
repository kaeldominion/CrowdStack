"use client";

import { AttendeeEventCard } from "@/components/AttendeeEventCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";

interface FeaturedEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  flier_url?: string | null;
  cover_image_url?: string | null;
  venue?: {
    name: string;
    city?: string | null;
  } | null;
}

interface FeaturedEventsCarouselProps {
  events: FeaturedEvent[];
}

export function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollability();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScrollability);
      window.addEventListener("resize", checkScrollability);
      return () => {
        scrollElement.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [events]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Scroll Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-glass/90 border border-border-subtle backdrop-blur-sm flex items-center justify-center hover:bg-glass hover:border-accent-primary/50 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-glass/90 border border-border-subtle backdrop-blur-sm flex items-center justify-center hover:bg-glass hover:border-accent-primary/50 transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 px-1"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {events.map((event) => (
          <div
            key={event.id}
            className="flex-shrink-0 w-[320px] sm:w-[380px]"
          >
            <AttendeeEventCard event={event} variant="default" />
          </div>
        ))}
      </div>
    </div>
  );
}

