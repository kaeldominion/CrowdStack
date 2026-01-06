"use client";

import { useState, useEffect } from "react";
import { Card, Badge, LoadingSpinner, Button, Select } from "@crowdstack/ui";
import { 
  Clock, 
  User, 
  Calendar, 
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { ActivityActionType, ActivityEntityType } from "@crowdstack/shared/activity/log-activity";

interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: ActivityActionType;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  users?: {
    id: string;
    email: string;
  } | null;
}

interface ActivityLogProps {
  userId?: string | null;
  entityType?: ActivityEntityType | null;
  entityId?: string | null;
  actionType?: ActivityActionType | null;
  title?: string;
  showFilters?: boolean;
  limit?: number;
}

const ACTION_LABELS: Record<ActivityActionType, string> = {
  register: "Registered",
  checkin: "Checked In",
  checkout: "Checked Out",
  profile_update: "Updated Profile",
  profile_view: "Viewed Profile",
  event_view: "Viewed Event",
  event_share: "Shared Event",
  photo_view: "Viewed Photo",
  photo_download: "Downloaded Photo",
  event_create: "Created Event",
  event_edit: "Edited Event",
  event_publish: "Published Event",
  event_unpublish: "Unpublished Event",
  event_delete: "Deleted Event",
  event_approve: "Approved Event",
  event_reject: "Rejected Event",
  event_feature: "Featured Event",
  event_unfeature: "Unfeatured Event",
  promoter_assign: "Assigned Promoter",
  promoter_unassign: "Unassigned Promoter",
  promoter_request: "Requested Promoter Access",
  promoter_approve: "Approved Promoter",
  promoter_reject: "Rejected Promoter",
  promoter_link_share: "Shared Link",
  promoter_qr_scan: "Scanned QR Code",
  organizer_create: "Created Organizer",
  organizer_edit: "Edited Organizer",
  organizer_user_add: "Added User to Organizer",
  organizer_user_remove: "Removed User from Organizer",
  venue_create: "Created Venue",
  venue_edit: "Edited Venue",
  venue_user_add: "Added User to Venue",
  venue_user_remove: "Removed User from Venue",
  door_staff_assign: "Assigned Door Staff",
  door_staff_unassign: "Unassigned Door Staff",
  door_staff_checkin: "Door Staff Check-in",
  photo_upload: "Uploaded Photo",
  photo_delete: "Deleted Photo",
  photo_publish: "Published Photo",
  photo_unpublish: "Unpublished Photo",
  album_create: "Created Album",
  album_delete: "Deleted Album",
  registration_create: "Created Registration",
  registration_cancel: "Cancelled Registration",
  registration_update: "Updated Registration",
  admin_user_edit: "Admin: Edited User",
  admin_user_delete: "Admin: Deleted User",
  admin_impersonate: "Admin: Started Impersonation",
  admin_impersonate_end: "Admin: Ended Impersonation",
};

const ENTITY_LABELS: Record<ActivityEntityType, string> = {
  event: "Event",
  attendee: "Attendee",
  promoter: "Promoter",
  organizer: "Organizer",
  venue: "Venue",
  registration: "Registration",
  checkin: "Check-in",
  photo: "Photo",
  album: "Album",
  user: "User",
  door_staff: "Door Staff",
  invite_code: "Invite Code",
};

const ACTION_COLORS: Record<string, "success" | "warning" | "error" | "secondary"> = {
  register: "success",
  checkin: "success",
  event_create: "success",
  event_publish: "success",
  event_approve: "success",
  promoter_approve: "success",
  photo_upload: "success",
  event_delete: "error",
  event_reject: "error",
  promoter_reject: "error",
  event_edit: "secondary",
  profile_update: "secondary",
  event_view: "secondary",
  profile_view: "secondary",
};

export function ActivityLog({
  userId,
  entityType,
  entityId,
  actionType,
  title = "Activity Log",
  showFilters = true,
  limit: initialLimit = 50,
}: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(initialLimit);
  const [filters, setFilters] = useState({
    actionType: actionType || "",
    entityType: entityType || "",
  });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      if (filters.entityType) params.set("entity_type", filters.entityType);
      if (entityId) params.set("entity_id", entityId);
      if (filters.actionType) params.set("action_type", filters.actionType);
      params.set("limit", limit.toString());
      params.set("offset", offset.toString());

      const response = await fetch(`/api/activity/logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [userId, entityType, entityId, filters, limit, offset]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getActionLabel = (actionType: ActivityActionType) => {
    return ACTION_LABELS[actionType] || actionType;
  };

  const getActionColor = (actionType: ActivityActionType) => {
    return ACTION_COLORS[actionType] || "secondary";
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <Button variant="ghost" size="sm" onClick={loadLogs}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-2 mb-4">
          <Select
            value={filters.actionType}
            onChange={(e) =>
              setFilters({ ...filters, actionType: e.target.value as ActivityActionType })
            }
            options={[
              { value: "", label: "All Actions" },
              ...Object.entries(ACTION_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            className="flex-1"
          />
          <Select
            value={filters.entityType}
            onChange={(e) =>
              setFilters({ ...filters, entityType: e.target.value as ActivityEntityType })
            }
            options={[
              { value: "", label: "All Entities" },
              ...Object.entries(ENTITY_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            className="flex-1"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-secondary">
          <p>No activity logs found</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-raised border border-border hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActionColor(log.action_type)}>
                      {getActionLabel(log.action_type)}
                    </Badge>
                    <span className="text-xs text-secondary">
                      {ENTITY_LABELS[log.entity_type]}
                    </span>
                  </div>
                  {log.users && (
                    <div className="flex items-center gap-1 text-sm text-secondary mb-1">
                      <User className="h-3 w-3" />
                      <span>{log.users.email}</span>
                    </div>
                  )}
                  {log.metadata.description && (
                    <p className="text-sm text-secondary">{log.metadata.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-sm text-secondary">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

