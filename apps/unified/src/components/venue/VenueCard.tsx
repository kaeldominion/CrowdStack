"use client";

import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import { Badge } from "@crowdstack/ui";
import { formatVenueLocation } from "@/lib/utils/format-venue-location";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    slug: string | null;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    tags?: { tag_type: string; tag_value: string }[];
  };
  /** Owner/organizer avatar URL */
  ownerAvatarUrl?: string | null;
  /** Show tags */
  showTags?: boolean;
  /** Layout orientation */
  layout?: "portrait" | "landscape";
  className?: string;
}

export function VenueCard({ 
  venue, 
  ownerAvatarUrl,
  showTags = true,
  layout = "portrait",
  className = "",
}: VenueCardProps) {
  const venueUrl = venue.slug ? `/v/${venue.slug}` : `/v/${venue.id}`;
  const heroImage = venue.cover_image_url || venue.logo_url;
  
  // Get standardized location string
  const location = formatVenueLocation({
    city: venue.city,
    state: venue.state,
    country: venue.country,
  });

  // Get music/category tags (limit to 2)
  const categoryTags = venue.tags
    ?.filter(t => t.tag_type === "music" || t.tag_type === "crowd_type")
    .slice(0, 2) || [];

  // Landscape layout - horizontal card
  if (layout === "landscape") {
  return (
      <Link 
        href={venueUrl} 
        className={`block group relative rounded-xl overflow-hidden border border-border-subtle hover:border-accent-primary/50 transition-all shadow-soft hover:shadow-lg bg-void ${className}`}
      >
        <div className="flex min-h-[96px]">
        {/* Image */}
          <div className="relative w-24 h-auto min-h-[96px] flex-shrink-0">
            {heroImage ? (
              <img
                src={heroImage}
              alt={venue.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-void to-accent-secondary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-muted" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1.5">
            <h3 className="font-sans text-sm font-bold text-primary group-hover:text-accent-secondary transition-colors truncate">
              {venue.name}
            </h3>
            {location && (
              <div className="flex items-center gap-1 text-secondary">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs truncate">{location}</span>
              </div>
            )}
            {/* Tags row */}
            {showTags && categoryTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categoryTags.map((tag, i) => (
                  <Badge 
                    key={i}
                    color="purple" 
                    variant="ghost"
                    size="sm"
                    className="!text-[9px] !px-1.5 !py-0.5"
                  >
                    {tag.tag_value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Portrait layout (default)
  return (
    <Link 
      href={venueUrl} 
      className={`block group relative rounded-2xl overflow-hidden border border-border-subtle hover:border-accent-primary/50 transition-all shadow-soft hover:shadow-lg bg-void ${className}`}
    >
      {/* Card Container - Portrait orientation with explicit height */}
      <div className="relative h-[400px]">
        {/* Background Image or Gradient */}
        {heroImage ? (
          <img
            src={heroImage}
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 via-void to-accent-secondary/10" />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-void/30" />
        
        {/* Top-left icon */}
        <div className="absolute top-4 left-4">
          <div className="w-8 h-8 rounded-lg bg-accent-success/20 border border-accent-success/30 flex items-center justify-center">
            <Navigation className="h-4 w-4 text-accent-success" />
          </div>
        </div>
        
        {/* Owner Avatar - positioned in middle-left area */}
        {ownerAvatarUrl && (
          <div className="absolute left-4 top-1/2 -translate-y-1/4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border-subtle shadow-lg">
              <img
                src={ownerAvatarUrl}
                alt="Owner"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* If no owner avatar but has logo, show logo */}
        {!ownerAvatarUrl && venue.logo_url && venue.cover_image_url && (
          <div className="absolute left-4 top-1/2 -translate-y-1/4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border-subtle shadow-lg bg-void">
              <img
                src={venue.logo_url}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
          {/* Venue Name & Location */}
          <div>
            <h3 className="font-sans text-xl font-bold text-primary group-hover:text-accent-secondary transition-colors line-clamp-2">
              {venue.name}
            </h3>
            
            {/* Location */}
            {location && (
              <div className="flex items-center gap-1.5 mt-1 text-secondary">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm truncate">{location}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {showTags && categoryTags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {categoryTags.map((tag, i) => (
                <Badge 
                  key={i}
                  color="blue" 
                  variant="outline" 
                  className="!rounded-full !px-3 !py-1 !text-[10px] !font-bold !uppercase !tracking-wider"
                >
                  {tag.tag_value}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
