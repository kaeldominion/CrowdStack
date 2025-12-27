"use client";

/**
 * VENUE EVENT CARD
 * 
 * Full card display for events on venue pages.
 * Uses design tokens - no hardcoded colors.
 * 
 * For attendee-facing events with registration actions, use AttendeeEventCard instead.
 */

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Users, ChevronRight, Radio, Ticket } from "lucide-react";
import { Badge } from "@crowdstack/ui";
import { RegisteredBadge } from "@/components/RegisteredBadge";

interface VenueEvent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  capacity: number | null;
  registration_count: number;
}

interface EventCardProps {
  event: VenueEvent;
  isLive?: boolean;
}

export function EventCard({ event, isLive = false }: EventCardProps) {
  const startDate = new Date(event.start_time);
  const imageUrl = event.flier_url || event.cover_image_url;
  const spotsLeft = event.capacity ? Math.max(event.capacity - event.registration_count, 0) : null;
  
  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <div className="relative bg-glass border border-border-subtle rounded-2xl overflow-hidden hover:border-accent-primary/50 hover:shadow-soft transition-all">
        {/* Image - Use slightly shorter 9:15 aspect ratio for fliers */}
        {imageUrl ? (
          <div className="relative aspect-[9/15] overflow-hidden">
            <Image
              src={imageUrl}
              alt={event.name}
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
            
            {/* Gradient fade to void at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent" />
            
            {/* Live badge */}
            {isLive && (
              <Badge 
                color="green" 
                variant="solid" 
                className="absolute top-3 left-3 z-10 !rounded-full !px-3 !py-1 !text-xs !font-bold"
              >
                <Radio className="h-3 w-3 animate-pulse mr-1.5" />
                LIVE NOW
              </Badge>
            )}
            
            {/* Registered badge */}
            <div className="absolute top-3 right-3 z-10">
              <RegisteredBadge eventSlug={event.slug} size="md" className="p-1.5" />
            </div>
            
            {/* Content Overlay - Bottom of Image */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-10">
              <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent-secondary transition-colors line-clamp-2">
                {event.name}
              </h3>
              
              <div className="flex items-center gap-3 text-sm text-secondary">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {startDate.toLocaleDateString("en-US", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {startDate.toLocaleTimeString("en-US", { 
                      hour: "numeric", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>
              </div>
              
              {(event.registration_count > 0 || event.capacity) && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted">
                    <Users className="h-3.5 w-3.5" />
                    <span>{event.registration_count} registered</span>
                  </div>
                  {spotsLeft !== null && (
                    <span className={`font-medium ${
                      spotsLeft <= 10 ? "text-accent-warning" : "text-accent-success"
                    }`}>
                      {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
          </div>
        ) : (
          /* Fallback if no image */
          <div className="aspect-[9/15] bg-raised p-4 flex flex-col justify-end relative">
            {/* Background icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Ticket className="h-16 w-16 text-muted/20" />
            </div>
            
            {/* Registered badge */}
            <div className="absolute top-3 right-3 z-10">
              <RegisteredBadge eventSlug={event.slug} size="md" className="p-1.5" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent-secondary transition-colors line-clamp-2">
                {event.name}
              </h3>
              <div className="flex items-center gap-3 text-sm text-secondary mt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {startDate.toLocaleDateString("en-US", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {startDate.toLocaleTimeString("en-US", { 
                      hour: "numeric", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

