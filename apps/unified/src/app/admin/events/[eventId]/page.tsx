"use client";

import { useParams } from "next/navigation";
import { EventDetailPage } from "@/components/EventDetailPage";

export default function AdminEventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <EventDetailPage
      eventId={eventId}
      config={{
        role: "admin",
        eventApiEndpoint: `/api/admin/events/${eventId}`,
        statsApiEndpoint: `/api/admin/events/${eventId}/stats`,
        approveApiEndpoint: `/api/admin/events/${eventId}/approve`,
        backUrl: "/admin/events",
        liveUrl: `/app/organizer/live/${eventId}`,
        canEdit: false,
        canManagePromoters: false,
        canManageDoorStaff: false,
        canViewAttendees: true,
        attendeesApiEndpoint: `/api/events/${eventId}/attendees`,
        canViewPromoters: true,
        canViewPhotos: true,
        canViewSettings: false,
        canViewStats: true,
        canApprove: true,
        canPublish: true,
        showVenueApproval: true,
        showEditHistory: false,
      }}
    />
  );
}
