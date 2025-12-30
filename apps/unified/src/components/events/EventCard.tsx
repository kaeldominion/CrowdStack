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

  const heroImage = event.flier_url;

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:border-accent-primary/30 hover:shadow-soft transition-all"
      onClick={onClick}
    >
      <div className="space-y-0">
        {/* Hero Image Section */}
        {heroImage && (
          <div className="relative h-40 w-full overflow-hidden border-b-2 border-border-subtle">
            <Image
              src={heroImage}
              alt={event.name}
              fill
              className="object-cover"
            />
            {/* Overlay with event name and date */}
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent flex flex-col justify-end p-3">
              <h3 className="text-base font-sans font-semibold text-primary mb-1 line-clamp-2">{event.name}</h3>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
                <span className="text-muted">•</span>
                <span>{formattedTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="p-3 space-y-3">
          {/* Event Name (if no hero image) */}
          {!heroImage && (
            <div>
              <h3 className="text-base font-sans font-semibold text-primary mb-1.5">{event.name}</h3>
              <div className="flex items-center gap-2 text-xs text-secondary">
                <Calendar className="h-3 w-3" />
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
              <span className="text-xs text-secondary">{event.organizer.name}</span>
            </div>
          )}

          {/* Venue Preview */}
          {event.venue && (
            <div className="pt-2 border-t border-border-subtle">
              <VenuePreview venue={event.venue} size="sm" />
            </div>
          )}

          {/* Stats Section */}
          <div className="pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">Registrations</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3 text-muted" />
                  <span className="text-xs text-primary font-semibold">{event.registrations}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary">Check-ins</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-muted" />
                  <span className="text-xs text-primary font-semibold">{event.checkins}</span>
                </div>
              </div>
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

