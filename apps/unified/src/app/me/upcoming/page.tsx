"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner } from "@crowdstack/ui";
import Link from "next/link";
import { Calendar, Clock, MapPin, Ticket, QrCode, Share2 } from "lucide-react";

interface Registration {
  id: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    cover_image_url: string | null;
    flier_url?: string | null;
    venue?: {
      name: string;
      city: string | null;
    } | null;
  } | null;
}

export default function UpcomingEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  const loadUpcomingEvents = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Get attendee
      const { data: attendee } = await supabase
        .from("attendees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!attendee) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Get all registrations and filter client-side for upcoming
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select(`
          id,
          event:events(
            id,
            name,
            slug,
            start_time,
            end_time,
            cover_image_url,
            flier_url,
            venue:venues(name, city)
          )
        `)
        .eq("attendee_id", attendee.id)
        .order("registered_at", { ascending: false });
      
      if (regError) {
        console.error("[Upcoming] Query error:", regError);
      }

      if (registrations) {
        const now = new Date();
        
        const upcoming = registrations
          .map((reg: any) => ({
            ...reg,
            event: Array.isArray(reg.event) ? reg.event[0] : reg.event,
          }))
          .map((reg: any) => ({
            ...reg,
            event: reg.event ? {
              ...reg.event,
              venue: Array.isArray(reg.event.venue) ? reg.event.venue[0] : reg.event.venue,
            } : null,
          }))
          .filter((reg: any) => {
            if (!reg.event) return false;
            const startTime = new Date(reg.event.start_time);
            // Include events that haven't started yet
            return startTime > now;
          })
          .sort((a: any, b: any) => {
            const aTime = new Date(a.event?.start_time || 0).getTime();
            const bTime = new Date(b.event?.start_time || 0).getTime();
            return aTime - bTime;
          });
        
        setEvents(upcoming);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Upcoming Events
          </h1>
          <p className="mt-2 text-white/60">
            {events.length} event{events.length !== 1 ? "s" : ""} on your calendar
          </p>
        </div>

        {/* Events List */}
        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((reg) => (
              <div
                key={reg.id}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Event Image */}
                {(reg.event?.flier_url || reg.event?.cover_image_url) && (
                  <div className="h-40 sm:h-48 relative">
                    <img
                      src={reg.event.flier_url || reg.event.cover_image_url || ""}
                      alt={reg.event.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}

                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">
                    {reg.event?.name}
                  </h2>

                  <div className="space-y-3 text-white/70">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-indigo-400" />
                      <span>{formatEventDate(reg.event?.start_time || "")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-indigo-400" />
                      <span>{formatEventTime(reg.event?.start_time || "")}</span>
                    </div>
                    {reg.event?.venue && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-indigo-400" />
                        <span>
                          {reg.event.venue.name}
                          {reg.event.venue.city && `, ${reg.event.venue.city}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <Link
                      href={`/e/${reg.event?.slug}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/25"
                    >
                      <QrCode className="h-5 w-5" />
                      View Ticket
                    </Link>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: reg.event?.name,
                            url: `${window.location.origin}/e/${reg.event?.slug}`,
                          });
                        } else {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/e/${reg.event?.slug}`
                          );
                        }
                      }}
                      className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
            <Ticket className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No upcoming events</h3>
            <p className="text-white/50 mb-6">
              Find your next great experience
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-medium hover:scale-105 transition-transform"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

