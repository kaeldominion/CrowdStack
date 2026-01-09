"use client";

import { useParams } from "next/navigation";
import { EventDetailPage } from "@/components/EventDetailPage";

export default function OrganizerEventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <EventDetailPage
      eventId={eventId}
      config={{
        role: "organizer",
        eventApiEndpoint: `/api/events/${eventId}`,
        statsApiEndpoint: `/api/events/${eventId}/stats`,
        attendeesApiEndpoint: `/api/events/${eventId}/attendees`,
        backUrl: "/app/organizer/events",
        liveUrl: `/app/organizer/live/${eventId}`,
        canEdit: true,
        canManagePromoters: true,
        canManageDoorStaff: true,
        canViewAttendees: true,
        canViewPromoters: true,
        canViewBookings: true,
        canViewPhotos: true,
        canViewSettings: true,
        canViewStats: true,
        canPublish: true,
        showVenueApproval: true,
        showEditHistory: true,
      }}
    />
  );
}
