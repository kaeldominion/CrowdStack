"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, LoadingSpinner, Badge } from "@crowdstack/ui";
import { Calendar, Users, MapPin, Clock, TrendingUp, Building2 } from "lucide-react";
import Link from "next/link";

interface VenueStats {
  totalEvents: number;
  upcomingEvents: number;
  totalAttendees: number;
  teamMembers: number;
}

interface RecentEvent {
  id: string;
  name: string;
  start_time: string;
  status: string;
  registrations?: number;
}

export default function AdminVenueOverviewPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [venueId]);

  const loadOverview = async () => {
    try {
      // Load stats
      const [statsRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/venues/${venueId}/stats`).catch(() => null),
        fetch(`/api/admin/venues/${venueId}/events?limit=5`).catch(() => null),
      ]);

      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (eventsRes?.ok) {
        const eventsData = await eventsRes.json();
        setRecentEvents(eventsData.events || []);
      }
    } catch (error) {
      console.error("Error loading overview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner text="Loading overview..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Calendar className="h-5 w-5 text-accent-primary" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                Total Events
              </p>
              <p className="text-2xl font-bold text-primary">
                {stats?.totalEvents ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-success/10">
              <Clock className="h-5 w-5 text-accent-success" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                Upcoming
              </p>
              <p className="text-2xl font-bold text-primary">
                {stats?.upcomingEvents ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-secondary/10">
              <Users className="h-5 w-5 text-accent-secondary" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                Attendees
              </p>
              <p className="text-2xl font-bold text-primary">
                {stats?.totalAttendees ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-warning/10">
              <Users className="h-5 w-5 text-accent-warning" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                Team
              </p>
              <p className="text-2xl font-bold text-primary">
                {stats?.teamMembers ?? "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/admin/venues/${venueId}/settings`}>
          <Card hover className="!p-4 cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-primary/10">
                <Building2 className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <p className="font-medium text-primary">Venue Settings</p>
                <p className="text-sm text-secondary">
                  Edit profile, gallery, and tags
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/admin/venues/${venueId}/team`}>
          <Card hover className="!p-4 cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-secondary/10">
                <Users className="h-5 w-5 text-accent-secondary" />
              </div>
              <div>
                <p className="font-medium text-primary">Manage Team</p>
                <p className="text-sm text-secondary">
                  Add or remove team members
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href={`/admin/venues/${venueId}/events`}>
          <Card hover className="!p-4 cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-success/10">
                <Calendar className="h-5 w-5 text-accent-success" />
              </div>
              <div>
                <p className="font-medium text-primary">View Events</p>
                <p className="text-sm text-secondary">
                  See all events at this venue
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div>
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">
            Recent Events
          </h2>
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}`}
                  className="block p-4 hover:bg-active/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">{event.name}</p>
                      <p className="text-sm text-secondary">
                        {new Date(event.start_time).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        event.status === "published"
                          ? "success"
                          : event.status === "draft"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
