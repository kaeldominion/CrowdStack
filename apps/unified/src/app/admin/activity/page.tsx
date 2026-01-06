"use client";

import { ActivityLog } from "@/components/ActivityLog";

export default function AdminActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">
          Activity Logs
        </h1>
        <p className="text-sm text-secondary">
          View all activity across the platform (admin only)
        </p>
      </div>
      <ActivityLog
        title="All Activity"
        showFilters={true}
        limit={100}
      />
    </div>
  );
}

