"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, LoadingSpinner, Badge, Button } from "@crowdstack/ui";
import {
  Calendar, Users, MapPin, Clock, Building2, ExternalLink,
  Mail, Phone, Globe, Instagram, Edit, ChevronRight, Check
} from "lucide-react";
import Link from "next/link";
import { MapPreview } from "@/components/venue/MapPreview";

interface VenueData {
  id: string;
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram_url?: string;
  description?: string;
  capacity?: number;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
}

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
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, [venueId]);

  const loadOverview = async () => {
    try {
      const [venueRes, statsRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/venues/${venueId}`),
        fetch(`/api/admin/venues/${venueId}/stats`).catch(() => null),
        fetch(`/api/admin/venues/${venueId}/events?limit=5`).catch(() => null),
      ]);

      if (venueRes.ok) {
        const venueData = await venueRes.json();
        setVenue(venueData.venue);
      }

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

  if (!venue) {
    return (
      <div className="text-center py-8 text-[var(--text-secondary)]">
        Venue not found
      </div>
    );
  }

  const hasLocation = venue.latitude && venue.longitude;
  const hasContactInfo = venue.email || venue.phone || venue.website || venue.instagram_url;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
              <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Total Events
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats?.totalEvents ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Upcoming
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats?.upcomingEvents ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--accent-secondary)]/10">
              <Users className="h-5 w-5 text-[var(--accent-secondary)]" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Attendees
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats?.totalAttendees ?? "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Team
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats?.teamMembers ?? "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Details */}
        <div className="space-y-4">
          {/* Contact & Info */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)] flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Venue Info
              </h3>
              <Link href={`/admin/venues/${venueId}/settings`}>
                <Button variant="ghost" size="sm">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {venue.description && (
                <p className="text-sm text-[var(--text-secondary)]">{venue.description}</p>
              )}

              {venue.capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)]">Capacity: {venue.capacity}</span>
                </div>
              )}

              {hasContactInfo && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  {venue.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-[var(--text-muted)]" />
                      <a href={`mailto:${venue.email}`} className="text-[var(--text-primary)] hover:underline">
                        {venue.email}
                      </a>
                    </div>
                  )}
                  {venue.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[var(--text-muted)]" />
                      <a href={`tel:${venue.phone}`} className="text-[var(--text-primary)] hover:underline">
                        {venue.phone}
                      </a>
                    </div>
                  )}
                  {venue.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                      <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:underline truncate">
                        {venue.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {venue.instagram_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      <a
                        href={`https://instagram.com/${venue.instagram_url.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-primary)] hover:underline"
                      >
                        {venue.instagram_url.startsWith('@') ? venue.instagram_url : `@${venue.instagram_url}`}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!venue.description && !venue.capacity && !hasContactInfo && (
                <p className="text-sm text-[var(--text-muted)] italic">
                  No venue details added yet. <Link href={`/admin/venues/${venueId}/settings`} className="text-[var(--accent-primary)] hover:underline">Add details</Link>
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)] flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Location
              </h3>
              <Link href={`/admin/venues/${venueId}/settings`}>
                <Button variant="ghost" size="sm">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </Link>
            </div>
            <div className="p-4">
              {hasLocation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs">
                    <Check className="h-4 w-4" />
                    <span>Map coordinates configured</span>
                  </div>

                  {(venue.address || venue.city) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-[var(--text-muted)] mt-0.5" />
                      <div className="text-[var(--text-secondary)]">
                        {venue.address && <div>{venue.address}</div>}
                        <div>
                          {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  <MapPreview
                    lat={venue.latitude}
                    lng={venue.longitude}
                    address={venue.address}
                    city={venue.city}
                    state={venue.state}
                    mapsUrl={venue.google_maps_url || ""}
                  />
                </div>
              ) : (
                <div className="text-center py-4">
                  <MapPin className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">No location set</p>
                  <Link href={`/admin/venues/${venueId}/settings`}>
                    <Button variant="secondary" size="sm" className="mt-2">
                      Add Location
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)]">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Quick Actions
              </h3>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <Link
                href={`/admin/venues/${venueId}/settings`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                    <Building2 className="h-4 w-4 text-[var(--accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Venue Settings</p>
                    <p className="text-xs text-[var(--text-muted)]">Edit profile, gallery, tags</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
              </Link>

              <Link
                href={`/admin/venues/${venueId}/team`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--accent-secondary)]/10">
                    <Users className="h-4 w-4 text-[var(--accent-secondary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Manage Team</p>
                    <p className="text-xs text-[var(--text-muted)]">Add or remove members</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
              </Link>

              {venue.slug && (
                <a
                  href={`${process.env.NEXT_PUBLIC_WEB_URL || ""}/v/${venue.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <ExternalLink className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">View Public Page</p>
                      <p className="text-xs text-[var(--text-muted)]">/v/{venue.slug}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </a>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-raised)]">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Recent Events
              </h3>
            </div>
            {recentEvents.length > 0 ? (
              <div className="divide-y divide-[var(--border-subtle)]">
                {recentEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="block px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{event.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(event.start_time).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
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
            ) : (
              <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                No events yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
