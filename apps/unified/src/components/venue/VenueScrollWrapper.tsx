"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface VenueScrollWrapperProps {
  children: React.ReactNode;
}

export function VenueScrollWrapper({ children }: VenueScrollWrapperProps) {
  const [cardAnimations, setCardAnimations] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll handler with staggered card animations (only on mobile)
  const handleScroll = useCallback(() => {
    if (!isMobile || !cardsContainerRef.current) return;
    
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;

    // Calculate individual card animations based on scroll position
    const cards = cardsContainerRef.current.querySelectorAll('[data-scroll-card]');
    const newAnimations: number[] = [];
    const totalCards = cards.length;
    
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const cardRect = cardElement.getBoundingClientRect();
      
      // Calculate how far into the viewport the card is
      const cardTop = cardRect.top;
      const triggerPoint = viewportHeight * 0.85; // Start animating when card is 85% down the viewport
      
      // Apply stagger delay: each card starts animating slightly later
      const staggerDelay = index * 40; // 40px stagger per card
      const adjustedCardTop = cardTop + staggerDelay;
      
      // Faster completion for later cards (they have less scroll distance available)
      const completionSpeed = 1 + (index / totalCards) * 0.5; // Later cards complete faster
      
      const cardProgress = Math.min(
        Math.max((triggerPoint - adjustedCardTop) / (viewportHeight * 0.35 / completionSpeed), 0),
        1
      );
      
      // Apply easing for smooth acceleration
      const easedProgress = cardProgress < 0.5
        ? 2 * cardProgress * cardProgress
        : 1 - Math.pow(-2 * cardProgress + 2, 2) / 2;
      
      newAnimations[index] = easedProgress;
    });
    
    setCardAnimations(newAnimations);
  }, [isMobile]);

  // Mark cards for animation on mount and when content changes (only on mobile)
  useEffect(() => {
    if (!isMobile || !cardsContainerRef.current) return;
    
    // Find all card-like elements (those with backdrop-blur or bg-white/)
    const allElements = cardsContainerRef.current.querySelectorAll('div');
    const cards: HTMLElement[] = [];
    
    allElements.forEach((element) => {
      const el = element as HTMLElement;
      const classes = el.className || '';
      // Check if it's a card-like element (has backdrop-blur or bg-white/ with rounded corners and padding)
      if ((classes.includes('backdrop-blur') || classes.includes('bg-white/')) &&
          classes.includes('rounded') && 
          (classes.includes('p-') || classes.includes('px-') || classes.includes('py-'))) {
        cards.push(el);
      }
    });
    
    cards.forEach((card, index) => {
      card.setAttribute('data-scroll-card', '');
      card.setAttribute('data-card-index', index.toString());
    });
    
    // Trigger initial scroll calculation
    handleScroll();
  }, [children, handleScroll, isMobile]);

  // Register scroll listener (only on mobile)
  useEffect(() => {
    if (!isMobile) return;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll, isMobile]);

  // Apply animations to cards (only on mobile)
  useEffect(() => {
    if (!isMobile || !cardsContainerRef.current) return;
    
    const cards = cardsContainerRef.current.querySelectorAll('[data-scroll-card]');
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const progress = cardAnimations[index] ?? 0;
      
      // Animate from below with scale
      const translateY = (1 - progress) * 80; // Start 80px below
      const scale = 0.92 + progress * 0.08; // Scale from 0.92 to 1
      const opacity = progress;
      
      cardElement.style.transform = `translateY(${translateY}px) scale(${scale})`;
      cardElement.style.opacity = opacity.toString();
      cardElement.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
      cardElement.style.willChange = 'transform, opacity';
    });
  }, [cardAnimations, isMobile]);

  return (
    <div ref={cardsContainerRef}>
      {children}
      {isMobile && (
        <style jsx global>{`
          /* Initial state for cards before JS takes over (mobile only) */
          @media (max-width: 1023px) {
            [data-scroll-card] {
              will-change: transform, opacity;
            }
          }
        `}</style>
      )}
    </div>
  );
}

