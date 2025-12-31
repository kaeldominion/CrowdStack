"use client";

import { useState, useEffect } from "react";
import { Card } from "@crowdstack/ui";
import { Radio, MapPin, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface LineupDJ {
  id: string;
  handle: string;
  name: string;
  profile_image_url: string | null;
  genres: string[] | null;
  location: string | null;
}

interface LineupItem {
  id: string;
  display_order: number;
  set_time: string | null;
  is_headliner: boolean;
  dj_id: string;
  djs: LineupDJ;
}

interface EventLineupProps {
  eventId: string;
}

export function EventLineup({ eventId }: EventLineupProps) {
  const [lineup, setLineup] = useState<LineupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLineup();
  }, [eventId]);

  const loadLineup = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/lineup`);
      if (!response.ok) return;
      const data = await response.json();
      setLineup(data.lineups || []);
    } catch (error) {
      console.error("Failed to load lineup:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || lineup.length === 0) {
    return null;
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-semibold text-primary">Lineup</h2>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        {lineup.map((item) => {
          const dj = item.djs;
          return (
            <Link key={item.id} href={`/dj/${dj.handle}`} className="block group">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-glass border border-border-subtle hover:bg-white/5 hover:border-accent-primary/50 transition-all cursor-pointer">
                {dj.profile_image_url ? (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-raised border border-border-subtle group-hover:border-accent-primary/50 transition-all">
                    <Image
                      src={dj.profile_image_url}
                      alt={dj.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="80px"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 border border-border-subtle">
                    {dj.name[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-sans text-sm sm:text-base font-black uppercase tracking-tight text-primary group-hover:text-accent-primary transition-colors">
                      {dj.name}
                    </h3>
                    {item.is_headliner && (
                      <Star className="h-4 w-4 text-warning fill-warning flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary">
                    {dj.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{dj.location}</span>
                      </div>
                    )}
                    {dj.genres && dj.genres.length > 0 && (
                      <span className="text-secondary truncate">
                        {dj.genres.slice(0, 2).join(", ")}
                        {dj.genres.length > 2 && "..."}
                      </span>
                    )}
                  </div>
                </div>

                {item.set_time && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-primary">
                      {new Date(item.set_time).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

