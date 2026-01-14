"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CardSize = "sm" | "md" | "lg";

interface WidgetCarouselProps {
  children: ReactNode;
  cardSize?: CardSize;
}

export function WidgetCarousel({ children, cardSize = "sm" }: WidgetCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollable = () => {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    return () => window.removeEventListener("resize", checkScrollable);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    // Get card width for smooth scrolling by one card at a time
    const card = el.querySelector(".widget-card-full") as HTMLElement;
    const scrollAmount = card ? card.offsetWidth + 12 : 200; // 12px gap

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="widget-carousel">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className={`widget-carousel-arrow widget-carousel-arrow-left ${
          canScrollLeft ? "widget-carousel-arrow-visible" : ""
        }`}
        aria-label="Previous"
        disabled={!canScrollLeft}
      >
        <ChevronLeft />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className={`widget-carousel-track widget-carousel-track-${cardSize}`}
        onScroll={checkScrollable}
      >
        {children}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className={`widget-carousel-arrow widget-carousel-arrow-right ${
          canScrollRight ? "widget-carousel-arrow-visible" : ""
        }`}
        aria-label="Next"
        disabled={!canScrollRight}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
