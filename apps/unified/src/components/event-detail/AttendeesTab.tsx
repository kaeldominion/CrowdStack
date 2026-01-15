"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Button,
  Input,
  InlineSpinner,
  useToast,
  VipBadge,
} from "@crowdstack/ui";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Crown,
  RefreshCw,
  Star,
  Sparkles,
  QrCode,
  Copy,
  Megaphone,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { EventDetailRole } from "@/components/EventDetailPage";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";

// Types
type ReferralSource = "direct" | "venue" | "organizer" | "promoter" | "user_referral";

interface Attendee {
  id: string;
  attendee_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  checked_in: boolean;
  check_in_time: string | null;
  referral_source: ReferralSource;
  promoter_id: string | null;
  promoter_name: string | null;
  referred_by_user_id: string | null;
  referred_by_user_name: string | null;
  is_organizer_vip?: boolean;
  is_venue_vip?: boolean;
  is_global_vip?: boolean;
  is_event_vip?: boolean;
  event_vip_reason?: string | null;
  notes?: string | null;
  notes_updated_at?: string | null;
  notes_updated_by_name?: string | null;
}

interface PromoterOption {
  id: string;
  name: string;
}

interface AttendeeStats {
  total: number;
  checked_in: number;
  not_checked_in: number;
  by_source: {
    direct: number;
    promoter: number;
    user_referral: number;
  };
}

interface InviteQRCode {
  id: string;
  invite_code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

interface AttendeesTabProps {
  eventId: string;
  role: EventDetailRole;
  attendees: Attendee[];
  attendeeStats: AttendeeStats | null;
  promoterOptions: PromoterOption[];
  inviteCodes: InviteQRCode[];
  isPromoterView: boolean;
  organizerId: string | null;
  eventOrganizerId?: string;
  venueId?: string | null;
  onRefresh: () => void;
  onCheckIn: (registrationId: string) => Promise<void>;
  onCheckOut?: (registrationId: string) => Promise<void>;
  onToggleEventVip: (registrationId: string, isCurrentlyVip?: boolean) => Promise<void>;
  onToggleOrganizerVip: (attendeeId: string, isCurrentlyVip: boolean) => Promise<void>;
  onToggleVenueVip: (attendeeId: string, isCurrentlyVip: boolean) => Promise<void>;
  checkingIn: string | null;
  checkingOut?: string | null;
  togglingVip: string | null;
}

export function AttendeesTab({
  eventId,
  role,
  attendees,
  attendeeStats,
  promoterOptions,
  inviteCodes,
  isPromoterView,
  organizerId,
  eventOrganizerId,
  venueId,
  onRefresh,
  onCheckIn,
  onCheckOut,
  onToggleEventVip,
  onToggleOrganizerVip,
  onToggleVenueVip,
  checkingIn,
  checkingOut,
  togglingVip,
}: AttendeesTabProps) {
  const toast = useToast();

  // Selected attendee for detail modal
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);

  // Prefetch cache for attendee details (keyed by attendeeId)
  const prefetchCache = useRef<Map<string, any>>(new Map());
  const prefetchTimeout = useRef<NodeJS.Timeout | null>(null);
  const prefetchingIds = useRef<Set<string>>(new Set());

  // Immediate prefetch (for touch - no debounce needed)
  const prefetchAttendeeImmediate = useCallback(async (attendeeId: string) => {
    if (prefetchCache.current.has(attendeeId) || prefetchingIds.current.has(attendeeId)) {
      return;
    }

    prefetchingIds.current.add(attendeeId);
    try {
      const endpoint = `/api/${role}/attendees/${attendeeId}`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        prefetchCache.current.set(attendeeId, data);
      }
    } catch (err) {
      console.debug("Prefetch failed for attendee:", attendeeId, err);
    } finally {
      prefetchingIds.current.delete(attendeeId);
    }
  }, [role]);

  // Prefetch attendee details on hover (with debounce for desktop)
  const prefetchAttendeeDetails = useCallback((attendeeId: string) => {
    // Skip if already cached or currently fetching
    if (prefetchCache.current.has(attendeeId) || prefetchingIds.current.has(attendeeId)) {
      return;
    }

    // Clear any pending prefetch
    if (prefetchTimeout.current) {
      clearTimeout(prefetchTimeout.current);
    }

    // Debounce the prefetch by 150ms to avoid too many requests on quick scrolls
    prefetchTimeout.current = setTimeout(() => {
      prefetchAttendeeImmediate(attendeeId);
    }, 150);
  }, [prefetchAttendeeImmediate]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [sourceFilter, setSourceFilter] = useState<ReferralSource | "all">("all");
  const [promoterFilter, setPromoterFilter] = useState<string>("all");
  const [vipFilter, setVipFilter] = useState<boolean | undefined>(undefined);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Mask functions for privacy
  const maskEmail = useCallback((email: string | null): string => {
    if (!email) return "-";
    if (role === "admin") return email;
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const maskedLocal = local.length > 2
      ? `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}`
      : "**";
    return `${maskedLocal}@${domain}`;
  }, [role]);

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((attendee) => {
      if (statusFilter === "checked_in" && !attendee.checked_in) return false;
      if (statusFilter === "not_checked_in" && attendee.checked_in) return false;
      if (sourceFilter !== "all" && attendee.referral_source !== sourceFilter) return false;
      if (promoterFilter !== "all" && attendee.promoter_id !== promoterFilter) return false;
      if (vipFilter !== undefined) {
        const isVip = attendee.is_organizer_vip || attendee.is_global_vip || attendee.is_event_vip;
        if (vipFilter !== isVip) return false;
      }
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        attendee.name.toLowerCase().includes(query) ||
        attendee.email?.toLowerCase().includes(query) ||
        attendee.promoter_name?.toLowerCase().includes(query) ||
        attendee.phone?.includes(query)
      );
    });
  }, [attendees, statusFilter, sourceFilter, promoterFilter, vipFilter, searchQuery]);

  const copyInviteLink = (inviteCode: string) => {
    let baseUrl = "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (origin.includes("app.crowdstack.app")) {
        baseUrl = origin.replace("app.crowdstack.app", "crowdstack.app");
      } else if (origin.includes("app-beta.crowdstack.app")) {
        baseUrl = origin.replace("app-beta.crowdstack.app", "beta.crowdstack.app");
      } else {
        baseUrl = origin;
      }
    }
    const link = `${baseUrl}/i/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(inviteCode);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Save notes handler (simplified: one note per attendee per org)
  const handleSaveNotes = useCallback(async (registrationId: string, notes: string) => {
    try {
      // Map role to notes role type - admin users default to organizer (they can edit but as organizer)
      const notesRole = role === "venue" ? "venue" : (role === "organizer" || role === "admin") ? "organizer" : "promoter";
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, role: notesRole }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Notes] Save failed:", response.status, errorData);
        throw new Error(errorData.error || "Failed to save notes");
      }
      toast.success("Notes saved");
    } catch (error: any) {
      console.error("[Notes] Error:", error);
      toast.error(error.message || "Failed to save notes");
      throw error;
    }
  }, [eventId, role, toast]);

  // Check if user can check in attendees
  const canCheckIn = !isPromoterView && (role === "organizer" || role === "venue");
  const canEditNotes = role === "organizer" || role === "venue" || role === "admin";
  const canToggleEventVip = ["venue", "organizer", "promoter", "admin"].includes(role);
  const canToggleVenueVip = role === "venue" && venueId;
  const canToggleOrganizerVip = role === "organizer" && (organizerId || eventOrganizerId);

  return (
    <div className="space-y-4">
      {/* Tracking QR Codes Section (for organizers) */}
      {role === "organizer" && (
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="section-header !mb-0 !text-[var(--accent-secondary)]">
                Tracking QR Codes
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Create QR codes with unique tracking links for promoters, flyers, or campaigns
              </p>
            </div>
            <Link href={`/app/organizer/events/${eventId}/invites`}>
              <Button variant="secondary" size="sm">
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                {inviteCodes.length > 0 ? "Manage" : "Create"}
              </Button>
            </Link>
          </div>
          {inviteCodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inviteCodes.slice(0, 3).map((invite) => (
                <div
                  key={invite.id}
                  className="p-3 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                      {invite.invite_code}
                    </code>
                    <button
                      onClick={() => copyInviteLink(invite.invite_code)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {copiedInviteId === invite.invite_code ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-success)]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] space-y-0.5">
                    <p>
                      Uses: {invite.used_count}
                      {invite.max_uses ? ` / ${invite.max_uses}` : " (unlimited)"}
                    </p>
                    {invite.expires_at && (
                      <p>Expires: {new Date(invite.expires_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 border border-dashed border-[var(--border-subtle)] rounded-lg">
              <QrCode className="h-6 w-6 text-[var(--text-muted)] mx-auto mb-1" />
              <p className="text-xs text-[var(--text-secondary)]">No tracking QR codes yet</p>
            </div>
          )}
        </div>
      )}

      {/* Stats Summary */}
      {attendeeStats && !isPromoterView && (
        <div className="flex flex-wrap gap-2">
          <div className="stat-chip">
            <span className="stat-chip-value">{attendeeStats.total}</span>
            <span className="stat-chip-label">Total</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value text-[var(--accent-success)]">{attendeeStats.checked_in}</span>
            <span className="stat-chip-label">Checked In</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value text-[var(--accent-warning)]">{attendeeStats.not_checked_in}</span>
            <span className="stat-chip-label">Pending</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value">{attendeeStats.by_source.direct}</span>
            <span className="stat-chip-label">Direct</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-value text-[var(--accent-secondary)]">{attendeeStats.by_source.promoter}</span>
            <span className="stat-chip-label">Promoters</span>
          </div>
        </div>
      )}

      {/* Promoter View Header */}
      {isPromoterView && (
        <div className="p-3 bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--text-primary)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Your Referrals</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Showing only guests you brought to this event
              </p>
            </div>
          </div>
          {attendeeStats && (
            <div className="flex gap-4 mt-2">
              <div>
                <span className="text-lg font-bold text-[var(--text-primary)]">{attendeeStats.total}</span>
                <span className="text-xs text-[var(--text-secondary)] ml-1">registered</span>
              </div>
              <div>
                <span className="text-lg font-bold text-[var(--accent-success)]">{attendeeStats.checked_in}</span>
                <span className="text-xs text-[var(--text-secondary)] ml-1">checked in</span>
              </div>
              <div>
                <span className="text-lg font-bold text-[var(--text-primary)]">
                  {attendeeStats.total > 0 ? Math.round((attendeeStats.checked_in / attendeeStats.total) * 100) : 0}%
                </span>
                <span className="text-xs text-[var(--text-secondary)] ml-1">conversion</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Attendees Section */}
      <div className="glass-panel">
        {/* Header with title and search */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="section-header !mb-0 !text-[var(--accent-secondary)]">
                {isPromoterView ? "Your Guests" : "Attendees"}
              </h3>
              <span className="text-xs text-[var(--text-muted)]">({filteredAttendees.length})</span>
              <button
                onClick={onRefresh}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Refresh list"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              placeholder="Search name, email, pro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 h-7 text-xs"
            />
          </div>

          {/* Filters */}
          {!isPromoterView && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* Status Pills */}
              <div className="flex gap-0.5 bg-[var(--bg-raised)] rounded-md p-0.5">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                    statusFilter === "all"
                      ? "bg-[var(--accent-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("checked_in")}
                  className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-0.5 transition-colors ${
                    statusFilter === "checked_in"
                      ? "bg-[var(--accent-success)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <UserCheck className="h-2.5 w-2.5" />
                  In
                </button>
                <button
                  onClick={() => setStatusFilter("not_checked_in")}
                  className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-0.5 transition-colors ${
                    statusFilter === "not_checked_in"
                      ? "bg-[var(--accent-warning)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  Pending
                </button>
              </div>

              {/* Source Filter */}
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as ReferralSource | "all")}
                className="h-6 px-1.5 text-[10px] bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)]"
              >
                <option value="all">All Sources</option>
                <option value="direct">Direct</option>
                <option value="promoter">Promoter</option>
                <option value="user_referral">User Referral</option>
              </select>

              {/* Promoter Filter */}
              {promoterOptions.length > 0 && (
                <select
                  value={promoterFilter}
                  onChange={(e) => setPromoterFilter(e.target.value)}
                  className="h-6 px-1.5 text-[10px] bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded text-[var(--text-secondary)]"
                >
                  <option value="all">All Promoters</option>
                  {promoterOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}

              {/* VIP Filter */}
              <button
                onClick={() => setVipFilter(vipFilter === true ? undefined : true)}
                className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-0.5 transition-colors ${
                  vipFilter === true
                    ? "bg-amber-500/30 text-amber-400 border border-amber-500/50"
                    : "bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-400"
                }`}
              >
                <Crown className="h-2.5 w-2.5" />
                VIP
              </button>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        {role !== "admin" && (
          <div className="px-3 py-1.5 bg-[var(--accent-primary)]/5 border-b border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Contact details masked for privacy. Admin access required for full information.
            </p>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-raised)] border-b border-[var(--border-subtle)]">
              <tr className="label-mono">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Promoter</th>
                <th className="px-3 py-2 w-28">Status</th>
                <th className="px-3 py-2 w-16">VIP</th>
                <th className="px-3 py-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]/50">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--text-secondary)] text-sm">
                    {isPromoterView
                      ? "You haven't referred any guests to this event yet"
                      : "No attendees found"}
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((attendee) => (
                  <tr
                    key={attendee.id}
                    className="hover:bg-[var(--bg-raised)]/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAttendeeId(attendee.attendee_id)}
                    onMouseEnter={() => prefetchAttendeeDetails(attendee.attendee_id)}
                    onTouchStart={() => prefetchAttendeeImmediate(attendee.attendee_id)}
                  >
                    {/* Name */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[140px]">
                          {attendee.name}
                        </span>
                        {attendee.notes && (
                          <span title="Has notes">
                            <StickyNote className="h-3 w-3 text-[var(--accent-secondary)] flex-shrink-0" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-3 py-2">
                      <span className="text-xs text-[var(--text-secondary)] block truncate max-w-[160px]">
                        {maskEmail(attendee.email)}
                      </span>
                    </td>

                    {/* Promoter */}
                    <td className="px-3 py-2">
                      {attendee.promoter_name ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[var(--accent-secondary)]">
                          <Megaphone className="h-2.5 w-2.5" />
                          <span className="truncate max-w-[100px]">{attendee.promoter_name}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">Direct</span>
                      )}
                    </td>

                    {/* Status (Check-in/out) - clickable to toggle */}
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {attendee.checked_in ? (
                        canCheckIn && onCheckOut ? (
                          <button
                            onClick={() => onCheckOut(attendee.id)}
                            disabled={checkingOut === attendee.id}
                            className="flex items-center gap-1.5 group"
                            title="Click to check out"
                          >
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-success)]/20 text-[var(--accent-success)] group-hover:bg-[var(--accent-warning)]/20 group-hover:text-[var(--accent-warning)] transition-colors w-fit">
                              {checkingOut === attendee.id ? (
                                <InlineSpinner size="xs" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-2.5 w-2.5 group-hover:hidden" />
                                  <UserX className="h-2.5 w-2.5 hidden group-hover:block" />
                                </>
                              )}
                              <span className="group-hover:hidden">In</span>
                              <span className="hidden group-hover:inline">Out</span>
                            </span>
                            {attendee.check_in_time && (
                              <span className="text-[9px] text-[var(--text-muted)]">
                                {new Date(attendee.check_in_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-success)]/20 text-[var(--accent-success)] w-fit">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              In
                            </span>
                            {attendee.check_in_time && (
                              <span className="text-[9px] text-[var(--text-muted)]">
                                {new Date(attendee.check_in_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        )
                      ) : canCheckIn ? (
                        <button
                          onClick={() => onCheckIn(attendee.id)}
                          disabled={checkingIn === attendee.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--accent-success)] hover:bg-[var(--accent-success)]/10 transition-colors"
                          title="Check in"
                        >
                          {checkingIn === attendee.id ? (
                            <InlineSpinner size="xs" />
                          ) : (
                            <>
                              <Clock className="h-2.5 w-2.5" />
                              Check in
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)]">
                          <Clock className="h-2.5 w-2.5" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* VIP Badges */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        {attendee.is_global_vip && <VipBadge level="global" variant="badge" size="xs" />}
                        {attendee.is_venue_vip && <VipBadge level="venue" variant="badge" size="xs" />}
                        {attendee.is_organizer_vip && <VipBadge level="organizer" variant="badge" size="xs" />}
                        {attendee.is_event_vip && <VipBadge level="event" variant="badge" size="xs" />}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {canToggleEventVip && (
                          <button
                            onClick={() => onToggleEventVip(attendee.id, attendee.is_event_vip)}
                            disabled={togglingVip === attendee.id}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              attendee.is_event_vip
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-emerald-400"
                            }`}
                            title={attendee.is_event_vip ? "Remove Event VIP" : "Mark as Event VIP"}
                          >
                            {togglingVip === attendee.id ? (
                              <InlineSpinner size="xs" />
                            ) : (
                              <VipBadge level="event" variant="icon" size="xs" iconOnly />
                            )}
                          </button>
                        )}
                        {canToggleVenueVip && (
                          <button
                            onClick={() => onToggleVenueVip(attendee.attendee_id, attendee.is_venue_vip || false)}
                            disabled={togglingVip === attendee.attendee_id || attendee.is_global_vip}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              attendee.is_venue_vip
                                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30"
                                : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                            }`}
                            title={attendee.is_venue_vip ? "Remove Venue VIP" : "Mark as Venue VIP"}
                          >
                            {togglingVip === attendee.attendee_id ? (
                              <InlineSpinner size="xs" />
                            ) : (
                              <Star className={`h-3.5 w-3.5 ${attendee.is_venue_vip ? "fill-current" : ""}`} />
                            )}
                          </button>
                        )}
                        {canToggleOrganizerVip && (
                          <button
                            onClick={() => onToggleOrganizerVip(attendee.attendee_id, attendee.is_organizer_vip || false)}
                            disabled={togglingVip === attendee.attendee_id || attendee.is_global_vip}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                              attendee.is_organizer_vip
                                ? "bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/30"
                                : "bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--accent-secondary)]"
                            }`}
                            title={attendee.is_organizer_vip ? "Remove Organizer VIP" : "Mark as Organizer VIP"}
                          >
                            {togglingVip === attendee.attendee_id ? (
                              <InlineSpinner size="xs" />
                            ) : (
                              <Sparkles className={`h-3.5 w-3.5 ${attendee.is_organizer_vip ? "fill-current" : ""}`} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Row View */}
        <div className="md:hidden divide-y divide-[var(--border-subtle)]/50">
          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
              {isPromoterView
                ? "You haven't referred any guests to this event yet"
                : "No attendees found"}
            </div>
          ) : (
            filteredAttendees.map((attendee) => (
              <div
                key={attendee.id}
                className="px-3 py-2.5 cursor-pointer hover:bg-[var(--bg-raised)]/30 transition-colors"
                onClick={() => setSelectedAttendeeId(attendee.attendee_id)}
                onMouseEnter={() => prefetchAttendeeDetails(attendee.attendee_id)}
                onTouchStart={() => prefetchAttendeeImmediate(attendee.attendee_id)}
              >
                {/* Top row: Name + VIP badges + Status */}
                <div className="flex items-center gap-2">
                  {/* Name (truncated) + Notes icon + VIP badges */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {attendee.name}
                    </span>
                    {attendee.notes && (
                      <span title="Has notes">
                        <StickyNote className="h-3 w-3 text-[var(--accent-secondary)] flex-shrink-0" />
                      </span>
                    )}
                    {(attendee.is_global_vip || attendee.is_venue_vip || attendee.is_organizer_vip || attendee.is_event_vip) && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {attendee.is_global_vip && <VipBadge level="global" variant="badge" size="xs" />}
                        {attendee.is_venue_vip && <VipBadge level="venue" variant="badge" size="xs" />}
                        {attendee.is_organizer_vip && <VipBadge level="organizer" variant="badge" size="xs" />}
                        {attendee.is_event_vip && <VipBadge level="event" variant="badge" size="xs" />}
                      </div>
                    )}
                  </div>

                  {/* Status badge - clickable to toggle checkout */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {attendee.checked_in ? (
                      canCheckIn && onCheckOut ? (
                        <>
                          <button
                            onClick={() => onCheckOut(attendee.id)}
                            disabled={checkingOut === attendee.id}
                            className="group"
                            title="Tap to check out"
                          >
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-success)]/20 text-[var(--accent-success)] active:bg-[var(--accent-warning)]/20 active:text-[var(--accent-warning)] transition-colors">
                              {checkingOut === attendee.id ? (
                                <InlineSpinner size="xs" />
                              ) : (
                                <CheckCircle2 className="h-2.5 w-2.5" />
                              )}
                              In
                            </span>
                          </button>
                          {attendee.check_in_time && (
                            <span className="text-[9px] text-[var(--text-muted)]">
                              {new Date(attendee.check_in_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-success)]/20 text-[var(--accent-success)]">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            In
                          </span>
                          {attendee.check_in_time && (
                            <span className="text-[9px] text-[var(--text-muted)]">
                              {new Date(attendee.check_in_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </>
                      )
                    ) : canCheckIn ? (
                      <button
                        onClick={() => onCheckIn(attendee.id)}
                        disabled={checkingIn === attendee.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)] active:text-[var(--accent-success)] active:bg-[var(--accent-success)]/10 transition-colors"
                      >
                        {checkingIn === attendee.id ? (
                          <InlineSpinner size="xs" />
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            In
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-raised)] text-[var(--text-muted)]">
                        <Clock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  {/* VIP action button */}
                  {canToggleEventVip && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleEventVip(attendee.id, attendee.is_event_vip)}
                        disabled={togglingVip === attendee.id}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                          attendee.is_event_vip
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-[var(--bg-raised)] text-[var(--text-muted)]"
                        }`}
                        title={attendee.is_event_vip ? "Remove VIP" : "Make VIP"}
                      >
                        {togglingVip === attendee.id ? (
                          <InlineSpinner size="xs" />
                        ) : (
                          <VipBadge level="event" variant="icon" size="xs" iconOnly />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom row: Promoter info */}
                {attendee.promoter_name && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--accent-secondary)]">
                    <Megaphone className="h-2.5 w-2.5" />
                    <span className="truncate">{attendee.promoter_name}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Attendee Detail Modal */}
      {role !== "admin" && (() => {
        const selectedAttendee = selectedAttendeeId
          ? filteredAttendees.find(a => a.attendee_id === selectedAttendeeId)
          : null;

        // Get prefetched data if available
        const prefetchedData = selectedAttendeeId
          ? prefetchCache.current.get(selectedAttendeeId)
          : null;

        return (
          <AttendeeDetailModal
            isOpen={!!selectedAttendeeId}
            onClose={() => setSelectedAttendeeId(null)}
            attendeeId={selectedAttendeeId || ""}
            role={role as "organizer" | "venue" | "promoter"}
            eventId={eventId}
            registrationId={selectedAttendee?.id}
            canEditNotes={canEditNotes}
            canToggleEventVip={canToggleEventVip}
            canToggleVenueVip={!!canToggleVenueVip}
            canToggleOrganizerVip={!!canToggleOrganizerVip}
            onSaveNotes={handleSaveNotes}
            onToggleEventVip={onToggleEventVip}
            onToggleVenueVip={onToggleVenueVip}
            onToggleOrganizerVip={onToggleOrganizerVip}
            togglingVip={togglingVip}
            attendeeNotes={selectedAttendee?.notes || ""}
            notesUpdatedAt={selectedAttendee?.notes_updated_at}
            notesUpdatedByName={selectedAttendee?.notes_updated_by_name}
            isEventVip={selectedAttendee?.is_event_vip || false}
            isVenueVip={selectedAttendee?.is_venue_vip || false}
            isOrganizerVip={selectedAttendee?.is_organizer_vip || false}
            isGlobalVip={selectedAttendee?.is_global_vip || false}
            prefetchedData={prefetchedData}
          />
        );
      })()}
    </div>
  );
}
