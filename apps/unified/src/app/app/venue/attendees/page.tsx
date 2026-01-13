"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, LoadingSpinner } from "@crowdstack/ui";
import { Search, Filter, Download, Crown, Users } from "lucide-react";
import type { VenueAttendee } from "@/lib/data/attendees-venue";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { AttendeesDashboardList } from "@/components/dashboard/AttendeesDashboardList";

export default function VenueAttendeesPage() {
  const [attendees, setAttendees] = useState<VenueAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [togglingVipId, setTogglingVipId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
    is_flagged: undefined as boolean | undefined,
    is_vip: undefined as boolean | undefined,
  });

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    try {
      const response = await fetch("/api/venue/attendees");
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || data);
      if (data.venueId) {
        setVenueId(data.venueId);
      }
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    let filtered = [...attendees];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone?.includes(search)
      );
    }

    // Check-in filter
    if (filters.has_check_in !== undefined) {
      filtered = filtered.filter((a) =>
        filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0
      );
    }

    // Flagged filter
    if (filters.is_flagged !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_flagged ? (a.strike_count || 0) > 0 : (a.strike_count || 0) === 0
      );
    }

    // VIP filter
    if (filters.is_vip !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_vip ? (a.is_venue_vip || a.is_global_vip) : !a.is_venue_vip && !a.is_global_vip
      );
    }

    return filtered;
  }, [search, filters, attendees]);

  const toggleVenueVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    if (!venueId) {
      alert("Venue ID not found");
      return;
    }

    setTogglingVipId(attendeeId);
    try {
      if (isCurrentlyVip) {
        const response = await fetch(
          `/api/venue/attendees/${attendeeId}/vip?venueId=${venueId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to remove VIP");
      } else {
        const response = await fetch(`/api/venue/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId }),
        });
        if (!response.ok) throw new Error("Failed to add VIP");
      }
      await loadAttendees();
    } catch (error) {
      console.error("Error toggling VIP:", error);
      alert("Failed to update VIP status");
    } finally {
      setTogglingVipId(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = attendees.length;
    const vips = attendees.filter(a => a.is_venue_vip || a.is_global_vip).length;
    const withAccount = attendees.filter(a => a.user_id).length;
    const checkedIn = attendees.filter(a => a.total_check_ins > 0).length;
    return { total, vips, withAccount, checkedIn };
  }, [attendees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--accent-secondary)]" />
            Attendees
          </h1>
          <p className="page-description">
            All attendees who have registered or checked in at your venue
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled title="Export disabled to protect privacy">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-2">
        <div className="stat-chip">
          <span className="stat-chip-value">{stats.total}</span>
          <span className="stat-chip-label">Total</span>
        </div>
        <div className="stat-chip">
          <div className="flex items-center gap-1">
            <Crown className="h-4 w-4 text-amber-400" />
            <span className="stat-chip-value text-amber-400">{stats.vips}</span>
          </div>
          <span className="stat-chip-label">VIPs</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-success)]">{stats.checkedIn}</span>
          <span className="stat-chip-label">Attended</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-value text-[var(--accent-primary)]">{stats.withAccount}</span>
          <span className="stat-chip-label">Linked</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() =>
              setFilters({
                ...filters,
                has_check_in: filters.has_check_in === true ? undefined : true,
              })
            }
            className={`px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
              filters.has_check_in === true
                ? "bg-[var(--accent-success)] text-white"
                : "bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Filter className="h-3 w-3" />
            Checked In
          </button>
          <button
            onClick={() =>
              setFilters({
                ...filters,
                is_flagged: filters.is_flagged === true ? undefined : true,
              })
            }
            className={`px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
              filters.is_flagged === true
                ? "bg-[var(--accent-error)] text-white"
                : "bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Flagged
          </button>
          <button
            onClick={() =>
              setFilters({
                ...filters,
                is_vip: filters.is_vip === true ? undefined : true,
              })
            }
            className={`px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-colors ${
              filters.is_vip === true
                ? "bg-amber-500 text-white"
                : "bg-[var(--bg-glass)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-amber-400"
            }`}
          >
            <Crown className="h-3 w-3" />
            VIP
          </button>
        </div>
      </div>

      {/* Privacy Notice - inline */}
      <div className="hidden md:block p-2.5 bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 rounded-lg">
        <p className="text-[10px] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Privacy:</strong> Contact details are masked. Use messaging features to communicate.
        </p>
      </div>

      {/* Attendees List */}
      <AttendeesDashboardList
        attendees={filteredAttendees}
        role="venue"
        entityId={venueId}
        onSelectAttendee={(a) => setSelectedAttendeeId(a.id)}
        onToggleVip={toggleVenueVip}
        togglingVipId={togglingVipId}
        isLoading={loading}
      />

      <AttendeeDetailModal
        isOpen={!!selectedAttendeeId}
        onClose={() => setSelectedAttendeeId(null)}
        attendeeId={selectedAttendeeId || ""}
        role="venue"
      />
    </div>
  );
}
