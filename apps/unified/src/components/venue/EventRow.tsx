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

export function EventRow({ event, isLive = false }: { event: VenueEvent; isLive?: boolean }) {
  const startDate = new Date(event.start_time);
  const imageUrl = event.flier_url || event.cover_image_url;
  
  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300">
        <div className="flex gap-3 p-3 items-center">
          {/* Small flier image */}
          {imageUrl ? (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-md overflow-hidden">
              <Image
                src={imageUrl}
                alt={event.name}
                fill
                className="object-cover object-top"
                sizes="64px"
              />
              {/* Live badge overlay */}
              {isLive && (
                <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium z-10">
                  <Radio className="h-2 w-2 animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-white/[0.03] rounded-md relative">
              {isLive && (
                <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                  <Radio className="h-2 w-2 animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
          )}
          
          {/* Event details */}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
                {event.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-white/70">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-white/40 flex-shrink-0" />
                  <span>
                    {startDate.toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-white/40 flex-shrink-0" />
                  <span>
                    {startDate.toLocaleTimeString("en-US", { 
                      hour: "numeric", 
                      minute: "2-digit" 
                    })}
                  </span>
                </div>
                {event.registration_count > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-white/40 flex-shrink-0" />
                    <span>{event.registration_count} registered</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Registered badge and arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <RegisteredBadge eventSlug={event.slug} size="sm" />
              <div className="flex items-center text-white/40 group-hover:text-white transition-colors">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

