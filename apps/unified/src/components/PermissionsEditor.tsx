"use client";

import { useState, useEffect } from "react";
import { Card, Button, Checkbox } from "@crowdstack/ui";
import type { VenuePermissions, OrganizerPermissions } from "@crowdstack/shared/types";

interface PermissionsEditorProps {
  permissions: VenuePermissions | OrganizerPermissions;
  onChange: (permissions: VenuePermissions | OrganizerPermissions) => void;
  type: "venue" | "organizer";
  disabled?: boolean;
}

const VENUE_PERMISSION_LABELS: Record<keyof VenuePermissions, string> = {
  manage_users: "Add/Remove Users",
  edit_profile: "Edit Profile",
  add_events: "Add Events",
  edit_events: "Edit Events",
  approve_events: "Approve Events",
  view_reports: "View Reports",
  manage_promoters: "Manage Promoters",
  manage_organizers: "Manage Organizers",
  manage_guests: "Manage Guests",
  full_admin: "Full Admin (All Permissions)",
};

const ORGANIZER_PERMISSION_LABELS: Record<keyof OrganizerPermissions, string> = {
  manage_users: "Add/Remove Users",
  edit_profile: "Edit Profile",
  add_events: "Add Events",
  edit_events: "Edit Events",
  delete_events: "Delete Events",
  view_reports: "View Reports",
  manage_promoters: "Manage Promoters",
  publish_photos: "Publish Photos",
  manage_payouts: "Manage Payouts",
  full_admin: "Full Admin (All Permissions)",
};

export function PermissionsEditor({
  permissions,
  onChange,
  type,
  disabled = false,
}: PermissionsEditorProps) {
  const [localPermissions, setLocalPermissions] = useState(permissions);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const handlePermissionChange = (key: string, value: boolean) => {
    const newPermissions = { ...localPermissions, [key]: value };

    // If full_admin is checked, set all permissions to true
    if (key === "full_admin" && value) {
      Object.keys(newPermissions).forEach((k) => {
        if (k !== "full_admin") {
          (newPermissions as any)[k] = true;
        }
      });
    } else if (key === "full_admin" && !value) {
      // If full_admin is unchecked, keep individual permissions but set full_admin to false
      (newPermissions as any).full_admin = false;
    } else if (!value && (localPermissions as any).full_admin) {
      // If unchecking a permission while full_admin is true, uncheck full_admin too
      (newPermissions as any).full_admin = false;
    }

    setLocalPermissions(newPermissions);
    onChange(newPermissions as VenuePermissions | OrganizerPermissions);
  };

  const labels =
    type === "venue" ? VENUE_PERMISSION_LABELS : ORGANIZER_PERMISSION_LABELS;

  // Get all permission keys except full_admin for grouping
  const regularPermissions = Object.keys(localPermissions).filter(
    (k) => k !== "full_admin"
  ) as Array<keyof typeof labels>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <label className="text-sm font-medium text-foreground">
          Permissions
        </label>
      </div>

      {/* Full Admin Checkbox (special, at the top) */}
      <div className="py-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={(localPermissions as any).full_admin || false}
            onChange={(e) =>
              handlePermissionChange("full_admin", e.target.checked)
            }
            disabled={disabled}
          />
          <label className="text-sm font-semibold text-foreground cursor-pointer">
            {labels.full_admin as string}
          </label>
        </div>
        {(localPermissions as any).full_admin && (
          <p className="text-xs text-foreground-muted mt-1 ml-6">
            All permissions are enabled
          </p>
        )}
      </div>

      {/* Regular Permissions */}
      <div className="space-y-2">
        {regularPermissions.map((key) => (
          <div key={key}>
            <Checkbox
              checked={(localPermissions as any)[key] || false}
              onChange={(e) =>
                handlePermissionChange(key, e.target.checked)
              }
              disabled={disabled || (localPermissions as any).full_admin}
              label={labels[key] as string}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

