"use client";

/**
 * MASTER DJ CARD COMPONENT
 * 
 * This is the primary DJ card component used throughout the site.
 * 
 * USAGE:
 * - Browse page: portrait layout for grid view
 * - Search results: row layout for list view
 * - Event lineups: compact layout
 * - Following lists: row layout
 * 
 * VARIANTS:
 * - portrait: Full card with square image, overlaid name (default)
 * - row: Horizontal list format with thumbnail
 * - compact: Minimal horizontal with smaller thumbnail
 * 
 * See /design-playground/cards for visual reference
 */

import Link from "next/link";
import Image from "next/image";
import { Card, Badge } from "@crowdstack/ui";
import { MapPin, Music, Users, Calendar } from "lucide-react";

export interface DJCardProps {
  dj: {
    id: string;
    name: string;
    handle: string;
    bio?: string | null;
    genres?: string[] | null;
    location?: string | null;
    profile_image_url?: string | null;
    cover_image_url?: string | null;
    follower_count?: number | null;
    event_count?: number | null;
  };
  layout?: "portrait" | "row" | "compact";
  showGenres?: boolean;
  showLocation?: boolean;
  showBio?: boolean;
  showStats?: boolean;
  maxGenres?: number;
}

export function DJCard({ 
  dj, 
  layout = "portrait",
  showGenres = true,
  showLocation = true,
  showBio = true,
  showStats = true,
  maxGenres = 3,
}: DJCardProps) {
  const imageUrl = dj.profile_image_url || dj.cover_image_url;
  const hasStats = showStats && (dj.follower_count || dj.event_count);

  // Compact layout - minimal horizontal
  if (layout === "compact") {
    return (
      <Link href={`/dj/${dj.handle}`} className="block group">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-glass/50 transition-all">
          {/* Small Avatar */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-raised">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={dj.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-4 h-4 text-muted" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-primary group-hover:text-accent-primary transition-colors truncate">
              {dj.name}
            </p>
            {showLocation && dj.location && (
              <p className="text-xs text-muted truncate">{dj.location}</p>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Row layout - horizontal list format
  if (layout === "row") {
    return (
      <Link href={`/dj/${dj.handle}`} className="block group">
        <Card padding="none" hover className="flex gap-4 p-3">
          {/* Avatar - rounded corners like DJ public profile */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-raised border border-border-subtle group-hover:border-accent-primary/50 transition-all">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={dj.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20">
                <Music className="w-8 h-8 text-muted" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
            {/* Top row: Name + Stats */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-sans text-sm sm:text-base font-black uppercase tracking-tight text-primary group-hover:text-accent-primary transition-colors truncate">
                {dj.name}
              </h3>
              {/* Stats - right aligned */}
              {hasStats && (
                <div className="flex items-center gap-3 flex-shrink-0">
                  {dj.follower_count !== undefined && dj.follower_count !== null && (
                    <div className="flex items-center gap-1 text-secondary">
                      <Users className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{dj.follower_count}</span>
                    </div>
                  )}
                  {dj.event_count !== undefined && dj.event_count !== null && (
                    <div className="flex items-center gap-1 text-secondary">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{dj.event_count}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Location */}
            {showLocation && dj.location && (
              <div className="flex items-center gap-1 text-secondary">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs truncate">{dj.location}</span>
              </div>
            )}

            {/* Bio snippet - 1 line max */}
            {showBio && dj.bio && (
              <p className="text-xs text-muted hidden sm:line-clamp-1">
                {dj.bio}
              </p>
            )}

            {/* Genres */}
            {showGenres && dj.genres && dj.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {dj.genres.slice(0, maxGenres).map((genre) => (
                  <Badge key={genre} color="purple" variant="ghost" size="sm" className="!text-[9px] !py-0.5 !px-1.5">
                    {genre}
                  </Badge>
                ))}
                {dj.genres.length > maxGenres && (
                  <Badge color="slate" variant="ghost" size="sm" className="!text-[9px] !py-0.5 !px-1.5">
                    +{dj.genres.length - maxGenres}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Card>
      </Link>
    );
  }

  // Portrait layout (default) - full card with square image
  return (
    <Link href={`/dj/${dj.handle}`} className="block group">
      <Card className="overflow-hidden hover:border-accent-primary/50 transition-all" padding="none">
        {/* Image */}
        <div className="relative aspect-square bg-raised">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={dj.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-16 h-16 text-muted" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/30 to-transparent" />
          
          {/* Stats overlay - top right */}
          {hasStats && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {dj.follower_count !== undefined && dj.follower_count !== null && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-void/60 backdrop-blur-sm">
                  <Users className="w-3 h-3 text-white/80" />
                  <span className="text-[10px] font-medium text-white/80">{dj.follower_count}</span>
                </div>
              )}
              {dj.event_count !== undefined && dj.event_count !== null && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-void/60 backdrop-blur-sm">
                  <Calendar className="w-3 h-3 text-white/80" />
                  <span className="text-[10px] font-medium text-white/80">{dj.event_count}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-sans font-black text-lg uppercase tracking-tight text-white group-hover:text-accent-primary transition-colors">
              {dj.name}
            </h3>
            {showLocation && dj.location && (
              <div className="flex items-center gap-1 text-xs text-white/70 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{dj.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content section */}
        <div className="p-4 pt-3 space-y-2">
          {/* Bio snippet */}
          {showBio && dj.bio && (
            <p className="text-xs text-secondary line-clamp-2">
              {dj.bio}
            </p>
          )}

          {/* Genres */}
          {showGenres && dj.genres && dj.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dj.genres.slice(0, maxGenres).map((genre) => (
                <Badge key={genre} color="purple" variant="ghost" size="sm">
                  {genre}
                </Badge>
              ))}
              {dj.genres.length > maxGenres && (
                <Badge color="slate" variant="ghost" size="sm">
                  +{dj.genres.length - maxGenres}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// Skeleton components for loading states
export function DJCardSkeleton({ layout = "portrait" }: { layout?: "portrait" | "row" | "compact" }) {
  if (layout === "compact") {
    return (
      <div className="flex items-center gap-3 p-2 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-raised" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-24 bg-raised rounded" />
          <div className="h-3 w-16 bg-raised rounded" />
        </div>
      </div>
    );
  }

  if (layout === "row") {
    return (
      <div className="flex gap-3 p-2.5 rounded-xl border border-border-subtle bg-glass animate-pulse">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-raised flex-shrink-0" />
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="h-4 w-32 bg-raised rounded" />
          <div className="h-2.5 w-20 bg-raised rounded" />
          <div className="flex gap-1 mt-1">
            <div className="h-4 w-10 bg-raised rounded-full" />
            <div className="h-4 w-12 bg-raised rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Portrait skeleton
  return (
    <div className="rounded-2xl overflow-hidden border border-border-subtle bg-void animate-pulse">
      <div className="aspect-square bg-raised" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-3/4 bg-raised rounded" />
        <div className="h-3 w-1/2 bg-raised rounded" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-12 bg-raised rounded-full" />
          <div className="h-5 w-14 bg-raised rounded-full" />
        </div>
      </div>
    </div>
  );
}

