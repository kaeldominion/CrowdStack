"use client";

import { useParams } from "next/navigation";
import { ActivityLog } from "@/components/ActivityLog";

export default function EventActivityPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">
          Event Activity
        </h1>
        <p className="text-sm text-secondary">
          View all activity and actions for this event
        </p>
      </div>
      <ActivityLog
        title="Event Activity Log"
        entityType="event"
        entityId={eventId}
        showFilters={true}
        limit={50}
      />
    </div>
  );
}

