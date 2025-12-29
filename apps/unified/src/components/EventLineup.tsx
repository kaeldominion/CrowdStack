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
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-secondary" />
        <h2 className="text-xl font-semibold text-primary">Lineup</h2>
      </div>

      <div className="space-y-3">
        {lineup.map((item) => {
          const dj = item.djs;
          return (
            <Link key={item.id} href={`/dj/${dj.handle}`}>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-glass border border-border-subtle hover:bg-white/5 transition-colors cursor-pointer">
                {dj.profile_image_url ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-border-subtle">
                    <Image
                      src={dj.profile_image_url}
                      alt={dj.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 border-2 border-border-subtle">
                    {dj.name[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-primary">{dj.name}</h3>
                    {item.is_headliner && (
                      <Star className="h-4 w-4 text-warning fill-warning" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-secondary">
                    {dj.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{dj.location}</span>
                      </div>
                    )}
                    {dj.genres && dj.genres.length > 0 && (
                      <span className="text-secondary">
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

