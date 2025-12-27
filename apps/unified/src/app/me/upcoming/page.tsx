"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { LoadingSpinner, Card, Button } from "@crowdstack/ui";
import Link from "next/link";
import { Ticket, ArrowLeft, CalendarDays } from "lucide-react";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";

interface Registration {
  id: string;
  checkins?: { checked_in_at: string }[];
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
          checkins(checked_in_at),
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
            checkins: Array.isArray(reg.checkins) ? reg.checkins : [],
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

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Loading events..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link 
          href="/me" 
          className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Back to Profile</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-accent-secondary" />
            </div>
            <div>
              <h1 className="page-title">Upcoming Events</h1>
            </div>
          </div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mt-4">
            {events.length} event{events.length !== 1 ? "s" : ""} on your calendar
          </p>
        </div>

        {/* Events Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((reg) => (
              reg.event && (
                <AttendeeEventCard
                  key={reg.id}
                  event={{
                    id: reg.event.id,
                    name: reg.event.name,
                    slug: reg.event.slug,
                    start_time: reg.event.start_time,
                    flier_url: reg.event.flier_url,
                    cover_image_url: reg.event.cover_image_url,
                    venue: reg.event.venue,
                  }}
                  registration={{
                    id: reg.id,
                    checkins: reg.checkins,
                  }}
                  variant="attending"
                  isAttending={true}
                  showShare={true}
                />
              )
            ))}
          </div>
        ) : (
          /* Empty State - using design system pattern */
          <Card className="!border-dashed">
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4">
                <Ticket className="h-8 w-8 text-muted" />
              </div>
              <h3 className="font-sans text-xl font-bold text-primary mb-2">
                No upcoming events
              </h3>
              <p className="text-sm text-secondary mb-6 max-w-sm mx-auto">
                Find your next great experience and add it to your calendar
              </p>
              <Button 
                href="/browse" 
                variant="primary"
              >
                Browse Events
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
