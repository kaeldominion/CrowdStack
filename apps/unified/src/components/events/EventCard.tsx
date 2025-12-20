"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, Badge, Button } from "@crowdstack/ui";
import { Calendar, MapPin, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { OrganizerAvatar } from "@/components/organizer/OrganizerAvatar";
import { VenuePreview } from "./VenuePreview";
import type { Organizer, Venue } from "@crowdstack/shared/types";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    status: string;
    venue_approval_status: string;
    venue_rejection_reason: string | null;
    registrations: number;
    checkins: number;
    flier_url: string | null;
    cover_image_url: string | null;
    venue: Venue | null;
    organizer: Organizer | null;
  };
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const startDate = new Date(event.start_time);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" title="Waiting for venue approval">
            Pending
          </Badge>
        );
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return (
          <Badge variant="danger" title={event.venue_rejection_reason || "Rejected"}>
            Rejected
          </Badge>
        );
      case "not_required":
        return null;
      default:
        return null;
    }
  };

  const heroImage = event.flier_url || event.cover_image_url;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="space-y-0">
        {/* Hero Image Section */}
        {heroImage && (
          <div className="relative h-48 w-full overflow-hidden border-b-2 border-border">
            <Image
              src={heroImage}
              alt={event.name}
              fill
              className="object-cover"
            />
            {/* Overlay with event name and date */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{event.name}</h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
                <span className="text-white/60">•</span>
                <span>{formattedTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-4">
          {/* Event Name (if no hero image) */}
          {!heroImage && (
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">{event.name}</h3>
              <div className="flex items-center gap-2 text-foreground-muted text-sm">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{formattedTime}</span>
              </div>
            </div>
          )}

          {/* Organizer Section */}
          {event.organizer && (
            <div className="flex items-center gap-2">
              <OrganizerAvatar organizer={event.organizer} size="sm" />
              <span className="text-sm text-foreground-muted">{event.organizer.name}</span>
            </div>
          )}

          {/* Venue Preview */}
          {event.venue && (
            <div className="pt-2 border-t border-border">
              <VenuePreview venue={event.venue} size="sm" />
            </div>
          )}

          {/* Stats Section */}
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-foreground-muted" />
              <span className="text-foreground-muted">{event.registrations}</span>
              <span className="text-foreground-muted">reg</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-foreground-muted" />
              <span className="text-foreground-muted">{event.checkins}</span>
              <span className="text-foreground-muted">checked in</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(event.status)}
            {getApprovalBadge(event.venue_approval_status)}
          </div>
        </div>
      </div>
    </Card>
  );
}

