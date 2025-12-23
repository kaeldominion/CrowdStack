"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, Users, ChevronRight, Radio } from "lucide-react";
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
  
  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300">
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
            
            {/* Gradient fade to black at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-black/40 to-transparent" />
            
            {/* Live badge */}
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
                <Radio className="h-3 w-3 animate-pulse" />
                LIVE NOW
              </div>
            )}
            
            {/* Registered badge */}
            <div className="absolute top-3 right-3 z-10">
              <RegisteredBadge eventSlug={event.slug} size="md" className="p-1.5" />
            </div>
            
            {/* Content Overlay - Bottom of Image */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 z-10">
              <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors line-clamp-2 drop-shadow-lg">
                {event.name}
              </h3>
              
              <div className="flex items-center gap-3 text-sm text-white/90">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="drop-shadow-md">
                    {startDate.toLocaleDateString("en-US", { 
                      weekday: "short", 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="drop-shadow-md">
                    {startDate.toLocaleTimeString("en-US", { 
                      hour: "numeric", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>
              </div>
              
              {event.registration_count > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-white/80">
                  <Users className="h-3.5 w-3.5" />
                  <span className="drop-shadow-md">{event.registration_count} registered</span>
                </div>
              )}
            </div>
            
            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <ChevronRight className="h-5 w-5 text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          /* Fallback if no image */
          <div className="aspect-[9/15] bg-white/[0.03] p-4 flex flex-col justify-end relative">
            {/* Registered badge */}
            <div className="absolute top-3 right-3 z-10">
              <RegisteredBadge eventSlug={event.slug} size="md" className="p-1.5" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
              {event.name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-white/70 mt-2">
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
        )}
      </div>
    </Link>
  );
}

