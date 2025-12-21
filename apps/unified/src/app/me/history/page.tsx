"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { Calendar, CheckCircle2, XCircle, Ticket } from "lucide-react";

interface Registration {
  id: string;
  created_at: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    cover_image_url: string | null;
    venue?: {
      name: string;
    } | null;
  } | null;
  checkins?: { checked_in_at: string }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPastEvents();
  }, []);

  const loadPastEvents = async () => {
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

      // Get past registrations
      const now = new Date().toISOString();
      const { data: registrations } = await supabase
        .from("registrations")
        .select(`
          id,
          created_at,
          event:events!inner(
            id,
            name,
            slug,
            start_time,
            cover_image_url,
            venue:venues(name)
          ),
          checkins(checked_in_at)
        `)
        .eq("attendee_id", attendee.id)
        .lt("event.start_time", now)
        .order("created_at", { ascending: false });

      if (registrations) {
        const normalized = registrations.map((reg: any) => ({
          ...reg,
          event: Array.isArray(reg.event) ? reg.event[0] : reg.event,
        })).map((reg: any) => ({
          ...reg,
          event: reg.event ? {
            ...reg.event,
            venue: Array.isArray(reg.event.venue) ? reg.event.venue[0] : reg.event.venue,
          } : null,
        }));
        setEvents(normalized);
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
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getYearFromDate = (dateStr: string) => {
    return new Date(dateStr).getFullYear();
  };

  // Group events by year
  const eventsByYear = events.reduce((acc, reg) => {
    if (!reg.event) return acc;
    const year = getYearFromDate(reg.event.start_time);
    if (!acc[year]) acc[year] = [];
    acc[year].push(reg);
    return acc;
  }, {} as Record<number, Registration[]>);

  const years = Object.keys(eventsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Event History
          </h1>
          <p className="mt-2 text-white/60">
            {events.length} event{events.length !== 1 ? "s" : ""} attended
          </p>
        </div>

        {/* Events by Year */}
        {years.length > 0 ? (
          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  {year}
                </h2>
                <div className="space-y-2">
                  {eventsByYear[year].map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors"
                    >
                      {/* Event Image */}
                      <div className="h-14 w-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {reg.event?.cover_image_url ? (
                          <img
                            src={reg.event.cover_image_url}
                            alt={reg.event.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Ticket className="h-6 w-6 text-white/30" />
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {reg.event?.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <span>{formatEventDate(reg.event?.start_time || "")}</span>
                          {reg.event?.venue && (
                            <>
                              <span>•</span>
                              <span>{reg.event.venue.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Check-in Status */}
                      <div className="flex-shrink-0">
                        {reg.checkins && reg.checkins.length > 0 ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Attended</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white/50 text-sm">
                            <XCircle className="h-4 w-4" />
                            <span>Missed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center">
            <Ticket className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No event history</h3>
            <p className="text-white/50">
              Your past events will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

