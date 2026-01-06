"use client";

import { ActivityLog } from "@/components/ActivityLog";

export default function UserActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">
          My Activity
        </h1>
        <p className="text-sm text-secondary">
          View all your activity and actions across the platform
        </p>
      </div>
      <ActivityLog
        title="Your Activity"
        showFilters={true}
        limit={50}
      />
    </div>
  );
}

