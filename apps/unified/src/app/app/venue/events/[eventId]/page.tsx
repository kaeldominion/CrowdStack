"use client";

import { useParams } from "next/navigation";
import { EventDetailPage } from "@/components/EventDetailPage";

export default function VenueEventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <EventDetailPage
      eventId={eventId}
      config={{
        role: "venue",
        eventApiEndpoint: `/api/venue/events/${eventId}`,
        statsApiEndpoint: `/api/events/${eventId}/stats`,
        attendeesApiEndpoint: `/api/events/${eventId}/attendees`,
        backUrl: "/app/venue/events",
        liveUrl: `/app/venue/live/${eventId}`,
        canEdit: true,
        canManagePromoters: true,
        canManageDoorStaff: true,
        canViewAttendees: true,
        canViewPromoters: true,
        canViewPhotos: false,
        canViewSettings: false,
        canViewStats: true,
        canApprove: false,
        canPublish: true,
        showEditHistory: true,
      }}
    />
  );
}
