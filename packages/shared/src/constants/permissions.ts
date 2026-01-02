// Client-safe permission constants
// These can be imported in both client and server components

import type { VenuePermissions, OrganizerPermissions } from "../types";

export const DEFAULT_VENUE_PERMISSIONS: VenuePermissions = {
  manage_users: false,
  edit_profile: false,
  add_events: false,
  edit_events: false,
  approve_events: false,
  view_reports: false,
  manage_promoters: false,
  manage_organizers: false,
  manage_guests: false,
  full_admin: false,
  // Event-specific permissions
  closeout_event: false,
  view_settings: false,
  manage_door_staff: false,
  view_financials: false,
};

export const FULL_ADMIN_VENUE_PERMISSIONS: VenuePermissions = {
  manage_users: true,
  edit_profile: true,
  add_events: true,
  edit_events: true,
  approve_events: true,
  view_reports: true,
  manage_promoters: true,
  manage_organizers: true,
  manage_guests: true,
  full_admin: true,
  // Event-specific permissions
  closeout_event: true,
  view_settings: true,
  manage_door_staff: true,
  view_financials: true,
};

export const DEFAULT_ORGANIZER_PERMISSIONS: OrganizerPermissions = {
  manage_users: false,
  edit_profile: false,
  add_events: false,
  edit_events: false,
  delete_events: false,
  view_reports: false,
  manage_promoters: false,
  publish_photos: false,
  manage_payouts: false,
  full_admin: false,
  // Event-specific permissions
  closeout_event: false,
  view_settings: false,
  manage_door_staff: false,
  view_financials: false,
};

export const FULL_ADMIN_ORGANIZER_PERMISSIONS: OrganizerPermissions = {
  manage_users: true,
  edit_profile: true,
  add_events: true,
  edit_events: true,
  delete_events: true,
  view_reports: true,
  manage_promoters: true,
  publish_photos: true,
  manage_payouts: true,
  full_admin: true,
  // Event-specific permissions
  closeout_event: true,
  view_settings: true,
  manage_door_staff: true,
  view_financials: true,
};







