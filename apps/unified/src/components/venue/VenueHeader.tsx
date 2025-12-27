"use client";

import Image from "next/image";
import { Card } from "@crowdstack/ui";
import type { Venue } from "@crowdstack/shared/types";

interface VenueHeaderProps {
  venue: Venue;
}

export function VenueHeader({ venue }: VenueHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Cover Image */}
      {venue.cover_image_url && (
        <div className="relative h-64 w-full overflow-hidden border-2 border-border">
          <Image
            src={venue.cover_image_url}
            alt={venue.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Header Content */}
      <Card>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo */}
          {venue.logo_url && (
            <div className="relative h-24 w-24 flex-shrink-0 border-2 border-border">
              <Image
                src={venue.logo_url}
                alt={`${venue.name} logo`}
                fill
                className="object-contain"
              />
            </div>
          )}

          {/* Text Content */}
          <div className="flex-1 space-y-3">
            <div>
              <h1
                className="text-4xl font-bold tracking-tight text-primary"
                style={venue.accent_color ? { color: venue.accent_color } : undefined}
              >
                {venue.name}
              </h1>
              {venue.tagline && (
                <p className="text-xl text-secondary mt-2">{venue.tagline}</p>
              )}
            </div>

            {venue.description && (
              <p className="text-secondary leading-relaxed">{venue.description}</p>
            )}

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              {venue.website && (
                <a
                  href={venue.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Website
                </a>
              )}
              {venue.instagram_url && (
                <a
                  href={venue.instagram_url.startsWith("http") ? venue.instagram_url : `https://instagram.com/${venue.instagram_url.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Instagram
                </a>
              )}
              {venue.phone && (
                <a href={`tel:${venue.phone}`} className="text-secondary hover:text-primary">
                  {venue.phone}
                </a>
              )}
              {venue.email && (
                <a href={`mailto:${venue.email}`} className="text-secondary hover:text-primary">
                  {venue.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

