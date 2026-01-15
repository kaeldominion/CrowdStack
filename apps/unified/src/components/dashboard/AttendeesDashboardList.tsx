"use client";

import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { VipBadge, InlineSpinner } from "@crowdstack/ui";
import {
  UserCheck,
  Crown,
  Star,
  Sparkles,
  Flag,
  Calendar,
  ChevronRight,
  StickyNote,
} from "lucide-react";

// Types
export type DashboardRole = "venue" | "organizer" | "promoter" | "admin";

export interface DashboardAttendee {
  id: string;
  name: string;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  instagram_handle?: string | null;
  // VIP statuses
  is_global_vip?: boolean;
  is_venue_vip?: boolean;
  is_organizer_vip?: boolean;
  // Stats
  events_attended?: number;
  events_count?: number;
  total_check_ins?: number;
  checkins_count?: number;
  venues_count?: number;
  strike_count?: number | null;
  last_event_at?: string | null;
  // Venue Pulse rating
  avg_venue_pulse_rating?: number | null;
  venue_pulse_count?: number;
  // Promoter-specific
  referral_count?: number;
  upcoming_signups?: number;
  // Admin fields
  created_at?: string;
  // Notes indicator
  has_note?: boolean;
}

interface AttendeesDashboardListProps {
  attendees: DashboardAttendee[];
  role: DashboardRole;
  entityId?: string | null; // venueId or organizerId for VIP toggling
  onSelectAttendee?: (attendee: DashboardAttendee) => void;
  onToggleVip?: (attendeeId: string, isCurrentlyVip: boolean) => void;
  togglingVipId?: string | null;
  isLoading?: boolean;
}

// Row height for virtual scrolling
const ROW_HEIGHT = 36;

export function AttendeesDashboardList({
  attendees,
  role,
  entityId,
  onSelectAttendee,
  onToggleVip,
  togglingVipId,
  isLoading,
}: AttendeesDashboardListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Get the appropriate VIP status for this role
  const getVipStatus = useCallback((attendee: DashboardAttendee) => {
    if (role === "venue") return attendee.is_venue_vip;
    if (role === "organizer") return attendee.is_organizer_vip;
    return false;
  }, [role]);

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: attendees.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Format date compactly
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Get strike badge
  const getStrikeBadge = (strikes: number | null | undefined) => {
    if (!strikes || strikes === 0) return null;
    if (strikes === 1) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">1 Strike</span>;
    if (strikes === 2) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-400">2 Strikes</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Banned</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <InlineSpinner size="sm" />
        <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading attendees...</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
      {/* Table Header - Responsive */}
      <div className={`grid gap-2 px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] ${
        role === "promoter"
          ? "grid-cols-[2fr_40px_40px_40px_60px] sm:grid-cols-[2fr_1fr_40px_40px_40px_60px] md:grid-cols-[1fr_1fr_60px_60px_60px_80px]"
          : role === "admin"
          ? "grid-cols-[1fr_1fr_60px_60px_60px_60px_80px_24px]"
          : role === "venue"
          ? "grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_1fr_50px_50px_50px_50px] md:grid-cols-[1fr_1fr_50px_60px_50px_50px_50px_50px_60px_36px]"
          : "grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_1fr_50px_50px_50px_50px] md:grid-cols-[1fr_1fr_50px_60px_50px_50px_50px_60px_36px]"
      }`}>
        <div>Name</div>
        <div className="hidden sm:block">Contact</div>
        {role === "promoter" ? (
          <>
            <div className="text-center">Refs</div>
            <div className="text-center hidden sm:block">Soon</div>
            <div className="text-center">Ins</div>
          </>
        ) : role === "admin" ? (
          <>
            <div className="text-center">Acct</div>
            <div className="text-center">Events</div>
            <div className="text-center">Ins</div>
            <div className="text-center">Venues</div>
          </>
        ) : (
          <>
            <div>VIP</div>
            <div className="text-center hidden sm:block">Acct</div>
            <div className="text-center">Events</div>
            <div className="text-center hidden sm:block">Ins</div>
            {role === "venue" && <div className="text-center hidden md:block">Pulse</div>}
            <div className="hidden md:block">Status</div>
          </>
        )}
        <div className="hidden md:block">Last</div>
        {role !== "promoter" && <div className="text-center hidden md:block">{role !== "admin" ? "Set" : ""}</div>}
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(attendees.length * ROW_HEIGHT + 20, 600) }}
      >
        {attendees.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
            No attendees found
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const attendee = attendees[virtualItem.index];
              const isVip = getVipStatus(attendee);
              const displayName = attendee.surname
                ? `${attendee.name} ${attendee.surname}`
                : attendee.name;

              return (
                <div
                  key={attendee.id}
                  className={`grid gap-2 items-center px-3 py-1 hover:bg-active transition-colors border-b border-[var(--border-subtle)]/50 cursor-pointer ${
                    role === "promoter"
                      ? "grid-cols-[2fr_40px_40px_40px_60px] sm:grid-cols-[2fr_1fr_40px_40px_40px_60px] md:grid-cols-[1fr_1fr_60px_60px_60px_80px]"
                      : role === "admin"
                      ? "grid-cols-[1fr_1fr_60px_60px_60px_60px_80px_24px]"
                      : role === "venue"
                      ? "grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_1fr_50px_50px_50px_50px] md:grid-cols-[1fr_1fr_50px_60px_50px_50px_50px_50px_60px_36px]"
                      : "grid-cols-[1fr_50px_50px] sm:grid-cols-[1fr_1fr_50px_50px_50px_50px] md:grid-cols-[1fr_1fr_50px_60px_50px_50px_50px_60px_36px]"
                  }`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  onClick={() => onSelectAttendee?.(attendee)}
                >
                  {/* Name - Mobile: More space, Desktop: Normal */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {displayName}
                    </span>
                    {attendee.has_note && (
                      <span title="Has notes">
                        <StickyNote className="h-3 w-3 text-[var(--accent-secondary)] flex-shrink-0" />
                      </span>
                    )}
                    {attendee.instagram_handle && (
                      <span className="text-[10px] text-pink-500 truncate hidden sm:inline">
                        @{attendee.instagram_handle}
                      </span>
                    )}
                    {/* Show contact on mobile below name if no instagram */}
                    {!attendee.instagram_handle && (
                      <span className="text-[10px] text-[var(--text-muted)] truncate sm:hidden">
                        {attendee.email || attendee.phone || ""}
                      </span>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="text-xs text-[var(--text-secondary)] truncate hidden sm:block">
                    {attendee.email || attendee.phone || "-"}
                  </div>

                  {role === "promoter" ? (
                    <>
                      {/* Referrals */}
                      <div className="text-center">
                        {(attendee.referral_count || 0) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-success)]/20 text-[var(--accent-success)]">
                            {attendee.referral_count}
                          </span>
                        )}
                      </div>
                      {/* Upcoming - Hidden on mobile */}
                      <div className="text-center hidden sm:block">
                        {(attendee.upcoming_signups || 0) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                            {attendee.upcoming_signups}
                          </span>
                        )}
                      </div>
                      {/* Check-ins */}
                      <div className="text-center text-xs text-[var(--text-secondary)]">
                        {attendee.total_check_ins || 0}
                      </div>
                    </>
                  ) : role === "admin" ? (
                    <>
                      {/* Account */}
                      <div className="flex items-center justify-center">
                        {attendee.user_id ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--accent-success)]/10">
                            <UserCheck className="h-3 w-3 text-[var(--accent-success)]" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">-</span>
                        )}
                      </div>
                      {/* Events */}
                      <div className="text-center text-xs text-[var(--text-secondary)]">
                        {attendee.events_count || 0}
                      </div>
                      {/* Check-ins */}
                      <div className="text-center text-xs text-[var(--text-secondary)]">
                        {attendee.checkins_count || 0}
                      </div>
                      {/* Venues */}
                      <div className="text-center text-xs text-[var(--text-secondary)]">
                        {attendee.venues_count || 0}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* VIP */}
                      <div className="flex items-center gap-1">
                        {attendee.is_global_vip && (
                          <VipBadge level="global" variant="badge" size="xs" />
                        )}
                        {role === "venue" && attendee.is_venue_vip && (
                          <VipBadge level="venue" variant="badge" size="xs" />
                        )}
                        {role === "organizer" && attendee.is_organizer_vip && (
                          <VipBadge level="organizer" variant="badge" size="xs" />
                        )}
                        {!attendee.is_global_vip && !isVip && (
                          <span className="text-[10px] text-[var(--text-muted)]">-</span>
                        )}
                      </div>
                      {/* Account - hidden on mobile */}
                      <div className="hidden sm:flex items-center justify-center">
                        {attendee.user_id ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--accent-success)]/10">
                            <UserCheck className="h-3 w-3 text-[var(--accent-success)]" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-muted)]">-</span>
                        )}
                      </div>
                      {/* Events */}
                      <div className="text-center text-xs text-[var(--text-secondary)]">
                        {attendee.events_attended || 0}
                      </div>
                      {/* Check-ins - hidden on mobile */}
                      <div className="hidden sm:block text-center text-xs text-[var(--text-secondary)]">
                        {attendee.total_check_ins || 0}
                      </div>
                      {/* Pulse Rating - venue only, hidden on mobile/tablet */}
                      {role === "venue" && (
                        <div className="hidden md:flex items-center justify-center">
                          {attendee.avg_venue_pulse_rating ? (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-[10px] text-[var(--text-primary)]">
                                {attendee.avg_venue_pulse_rating}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)]">-</span>
                          )}
                        </div>
                      )}
                      {/* Status - hidden on mobile/tablet */}
                      <div className="hidden md:flex items-center justify-start gap-1.5">
                        {(attendee.total_check_ins || 0) > 0 ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-[var(--accent-success)] flex-shrink-0" />
                            <span className="text-[10px] text-[var(--accent-success)]">In</span>
                          </>
                        ) : (
                          getStrikeBadge(attendee.strike_count) || <span className="text-[10px] text-[var(--text-muted)]">-</span>
                        )}
                      </div>
</>
                  )}

                  {/* Last Event - Hidden on mobile/tablet */}
                  <div className="hidden md:block text-[10px] text-[var(--text-muted)]">
                    {formatDate(attendee.last_event_at || attendee.created_at)}
                  </div>

                  {/* Actions (not for promoter) - Hidden on mobile/tablet */}
                  {role !== "promoter" && (
                    <div className="hidden md:flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      {role !== "admin" && onToggleVip && entityId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVip(attendee.id, isVip || false);
                          }}
                          disabled={togglingVipId === attendee.id || attendee.is_global_vip}
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                            attendee.is_global_vip
                              ? "opacity-30 cursor-not-allowed"
                              : isVip
                              ? role === "venue"
                                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                                : "bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)]/30"
                              : "bg-active text-[var(--text-muted)] hover:bg-active/80 hover:text-amber-400"
                          }`}
                          title={
                            attendee.is_global_vip
                              ? "Global VIP (system-managed)"
                              : isVip
                              ? `Remove ${role} VIP`
                              : `Mark as ${role} VIP`
                          }
                        >
                          {togglingVipId === attendee.id ? (
                            <InlineSpinner size="xs" />
                          ) : role === "venue" ? (
                            <Star className={`h-4 w-4 ${isVip ? "fill-current" : ""}`} />
                          ) : (
                            <Sparkles className={`h-4 w-4 ${isVip ? "fill-current" : ""}`} />
                          )}
                        </button>
                      )}
                      {role === "admin" && (
                        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with total count */}
      <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
        <p className="text-[10px] text-[var(--text-muted)] font-mono">
          {attendees.length} attendees
        </p>
      </div>
    </div>
  );
}
