"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "@crowdstack/ui";
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface DJEvent {
  id: string;
  slug: string;
  name: string;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  venues: { name: string; city: string | null } | null;
  display_order: number;
  set_time: string | null;
}

export default function DJEventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DJEvent[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      // Get DJ profile to find events via lineup
      const profileResponse = await fetch("/api/dj/profile");
      if (!profileResponse.ok) throw new Error("Failed to load profile");
      const profileData = await profileResponse.json();
      
      // Fetch events where DJ is on lineup
      const response = await fetch(`/api/djs/by-handle/${profileData.dj.handle}`);
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      
      setEvents(data.upcomingEvents || []);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  const upcomingEvents = events.filter((e) => new Date(e.start_time) > new Date());
  const pastEvents = events.filter((e) => new Date(e.start_time) <= new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Your Events</h1>
        <p className="mt-2 text-sm text-white/60">Events where you're on the lineup</p>
      </div>

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <Link key={event.id} href={`/e/${event.slug}`}>
                <Card className="p-4 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    {event.flier_url && (
                      <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={event.flier_url}
                          alt={event.name}
                          width={80}
                          height={112}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1">{event.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(event.start_time).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {event.set_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(event.set_time).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        {event.venues && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.venues.name}{event.venues.city ? `, ${event.venues.city}` : ""}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-white/40" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map((event) => (
              <Link key={event.id} href={`/e/${event.slug}`}>
                <Card className="p-4 hover:bg-white/5 transition-colors cursor-pointer opacity-75">
                  {event.flier_url && (
                    <div className="w-full h-48 rounded-lg overflow-hidden mb-3">
                      <Image
                        src={event.flier_url}
                        alt={event.name}
                        width={300}
                        height={192}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <h3 className="font-medium text-white mb-1">{event.name}</h3>
                  <p className="text-xs text-white/40">
                    {new Date(event.start_time).toLocaleDateString()}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length === 0 && pastEvents.length === 0 && (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No events yet</h3>
          <p className="text-white/60">You haven't been added to any event lineups yet.</p>
        </Card>
      )}
    </div>
  );
}



