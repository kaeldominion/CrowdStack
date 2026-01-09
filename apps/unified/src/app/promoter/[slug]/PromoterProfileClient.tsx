"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Badge, LoadingSpinner, Button } from "@crowdstack/ui";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Instagram,
  Share2,
  CheckCircle2,
  PartyPopper,
  MessageCircle,
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  flier_url: string | null;
  capacity: number | null;
  registration_count: number;
  venue: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
  } | null;
  organizer: {
    id: string;
    name: string;
  } | null;
}

interface PastEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  flier_url: string | null;
  venue: {
    name: string;
    city: string | null;
  } | null;
}

interface Promoter {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
}

interface Stats {
  total_events_promoted: number;
  total_checkins: number;
}

interface PromoterProfileClientProps {
  slug: string;
  promoterId: string;
}

export function PromoterProfileClient({ slug, promoterId }: PromoterProfileClientProps) {
  const [promoter, setPromoter] = useState<Promoter | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/promoters/by-slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPromoter(data.promoter);
          setUpcomingEvents(data.upcoming_events);
          setPastEvents(data.past_events);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to load promoter profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: promoter?.name || "Check out this promoter",
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  if (!promoter) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Card className="text-center p-8">
          <h1 className="text-xl font-bold text-primary mb-2">Profile Not Found</h1>
          <p className="text-secondary">This promoter profile doesn't exist or is private.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent-primary/20 via-accent-secondary/10 to-transparent pb-8">
        <div className="max-w-4xl mx-auto px-4 pt-24">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            {/* Avatar */}
            <div className="relative">
              {promoter.profile_image_url ? (
                <Image
                  src={promoter.profile_image_url}
                  alt={promoter.name}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-accent-primary/30 object-cover"
                />
              ) : (
                <div className="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-4xl font-black text-white">
                  {promoter.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-3xl font-black text-white">{promoter.name}</h1>
                <Badge variant="secondary" className="!bg-accent-primary/20 !text-accent-primary">
                  Promoter
                </Badge>
              </div>

              {promoter.bio && (
                <p className="text-secondary mb-4 max-w-lg">{promoter.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats?.total_events_promoted || 0}</div>
                  <div className="text-xs text-secondary uppercase tracking-wider">Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{stats?.total_checkins || 0}</div>
                  <div className="text-xs text-secondary uppercase tracking-wider">Guests</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {promoter.instagram_handle && (
                  <a
                    href={`https://instagram.com/${promoter.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    @{promoter.instagram_handle}
                  </a>
                )}
                {promoter.whatsapp_number && (
                  <a
                    href={`https://wa.me/${promoter.whatsapp_number.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                <Button variant="secondary" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* Upcoming Events */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            Upcoming Events
          </h2>

          {upcomingEvents.length === 0 ? (
            <Card className="text-center py-12">
              <PartyPopper className="h-12 w-12 text-muted mx-auto mb-4" />
              <p className="text-secondary">No upcoming events right now.</p>
              <p className="text-sm text-muted mt-1">Check back soon!</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/e/${event.slug}?ref=${promoterId}`}
                  className="block group"
                >
                  <Card className="overflow-hidden hover:border-accent-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent-primary/10">
                    <div className="flex flex-col sm:flex-row">
                      {/* Event Image */}
                      {event.flier_url && (
                        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
                          <Image
                            src={event.flier_url}
                            alt={event.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* Event Info */}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-primary group-hover:text-accent-primary transition-colors">
                              {event.name}
                            </h3>

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-secondary">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(event.start_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTime(event.start_time)}
                              </span>
                              {event.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {event.venue.name}
                                  {event.venue.city && `, ${event.venue.city}`}
                                </span>
                              )}
                            </div>

                            {event.description && (
                              <p className="text-sm text-muted mt-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>

                          {/* Registration count */}
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-accent-success">
                              <Users className="h-4 w-4" />
                              <span className="font-bold">{event.registration_count}</span>
                            </div>
                            <span className="text-xs text-muted">attending</span>
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-muted">
                            By {event.organizer?.name || "Unknown"}
                          </span>
                          <span className="px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-bold rounded-lg group-hover:shadow-lg transition-shadow">
                            Register Free
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent-success" />
              Recent Events
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pastEvents.map((event) => (
                <div
                  key={event.id}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-raised group"
                >
                  {event.flier_url ? (
                    <Image
                      src={event.flier_url}
                      alt={event.name}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs text-white/60 mb-1">{formatDate(event.start_time)}</p>
                    <h4 className="text-sm font-bold text-white line-clamp-2">{event.name}</h4>
                    {event.venue && (
                      <p className="text-xs text-white/60 mt-1">{event.venue.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
