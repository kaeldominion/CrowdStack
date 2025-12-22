"use client";

import { useParams } from "next/navigation";
import { EventDetailPage } from "@/components/EventDetailPage";

export default function PromoterEventPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <EventDetailPage
      eventId={eventId}
      config={{
        role: "promoter",
        eventApiEndpoint: `/api/promoter/events/${eventId}`,
        statsApiEndpoint: `/api/promoter/events/${eventId}/stats`,
        backUrl: "/app/promoter/events",
        liveUrl: `/app/promoter/live/${eventId}`,
        canEdit: false,
        canManagePromoters: false,
        canManageDoorStaff: false,
        canViewAttendees: true, // Promoters can see their own referrals
        canViewPromoters: false,
        canViewPhotos: false,
        canViewSettings: false,
        canViewStats: true,
      }}
    />
  );
}
