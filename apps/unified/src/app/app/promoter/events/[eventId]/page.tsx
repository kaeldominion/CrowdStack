"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Badge } from "@crowdstack/ui";
import { 
  Calendar, 
  MapPin, 
  Users, 
  QrCode, 
  Radio, 
  ArrowLeft,
  Share2,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  status: string;
  venue?: { name: string; address: string | null };
}

interface PromoterStats {
  referrals: number;
  checkins: number;
  conversionRate: number;
}

export default function PromoterEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<PromoterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventAndStats();
  }, [eventId]);

  const loadEventAndStats = async () => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/promoter/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData.event);
      }

      // Fetch promoter-specific stats
      const statsResponse = await fetch(`/api/promoter/events/${eventId}/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // Default stats if endpoint not available
        setStats({ referrals: 0, checkins: 0, conversionRate: 0 });
      }
    } catch (error) {
      console.error("Failed to load event:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Event Not Found</h2>
        <p className="text-foreground-muted mb-4">This event doesn't exist or you don't have access.</p>
        <Link href="/app/promoter/events">
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/promoter/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            {event.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(event.status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/promoter/live/${eventId}`}>
            <Button variant="primary">
              <Radio className="h-4 w-4 mr-2" />
              Live View
            </Button>
          </Link>
          <Link href={`/events/${event.id}/share`} target="_blank">
            <Button variant="secondary">
              <Share2 className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          </Link>
          <Link href={`/promoter/qr/${eventId}`} target="_blank">
            <Button variant="secondary">
              <QrCode className="h-4 w-4 mr-2" />
              My QR Code
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">My Referrals</p>
                <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                  {stats.referrals}
                </p>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Check-ins</p>
                <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                  {stats.checkins}
                </p>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-success/10">
                <UserCheck className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Conversion Rate</p>
                <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                  {stats.conversionRate.toFixed(0)}%
                </p>
              </div>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Date & Time</p>
                <p className="text-sm text-foreground-muted">{formatDate(event.start_time)}</p>
                {event.end_time && (
                  <p className="text-sm text-foreground-muted">Until {formatDate(event.end_time)}</p>
                )}
              </div>
            </div>

            {event.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Venue</p>
                  <p className="text-sm text-foreground-muted">{event.venue.name}</p>
                  {event.venue.address && (
                    <p className="text-sm text-foreground-muted">{event.venue.address}</p>
                  )}
                </div>
              </div>
            )}

            {event.capacity && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Capacity</p>
                  <p className="text-sm text-foreground-muted">{event.capacity} attendees</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
          <p className="text-foreground-muted whitespace-pre-wrap">
            {event.description || "No description provided."}
          </p>
        </Card>
      </div>
    </div>
  );
}
