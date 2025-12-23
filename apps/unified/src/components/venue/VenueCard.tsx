"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    slug: string | null;
    tagline: string | null;
    description: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    city: string | null;
    state: string | null;
    country: string;
  };
}


export function VenueCard({ venue }: VenueCardProps) {
  const imageUrl = venue.cover_image_url || venue.logo_url;
  const venueUrl = venue.slug ? `/v/${venue.slug}` : "#";

  return (
    <Link href={venueUrl} className="group block">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300">
        {/* Image */}
        {imageUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={imageUrl}
              alt={venue.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <div className="text-white/40 text-4xl font-bold">
              {venue.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Logo or initial */}
          {venue.logo_url && !imageUrl ? (
            <div className="relative h-16 w-16 rounded-xl overflow-hidden mb-4 border border-white/20">
              <Image
                src={venue.logo_url}
                alt={venue.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          ) : null}

          {/* Title and tagline */}
          <div className="mb-3">
            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1 mb-1">
              {venue.name}
            </h3>
            {venue.tagline && (
              <p className="text-sm text-white/70 line-clamp-2">
                {venue.tagline}
              </p>
            )}
          </div>

          {/* Location */}
          {(venue.city || venue.state) && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">
                {[venue.city, venue.state].filter(Boolean).join(", ")}
                {venue.country && venue.country !== "US" && `, ${venue.country}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

