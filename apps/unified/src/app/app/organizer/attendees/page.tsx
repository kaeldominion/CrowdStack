"use client";

import { useState, useEffect, useMemo } from "react";
import { Input, Button } from "@crowdstack/ui";
import { Filter, Download, Crown } from "lucide-react";
import type { OrganizerAttendee } from "@/lib/data/attendees-organizer";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { AttendeesDashboardList } from "@/components/dashboard/AttendeesDashboardList";

export default function OrganizerAttendeesPage() {
  const [attendees, setAttendees] = useState<OrganizerAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [togglingVipId, setTogglingVipId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    has_check_in: undefined as boolean | undefined,
    is_vip: undefined as boolean | undefined,
  });

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    try {
      // Add cache busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/organizer/attendees?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data.attendees || data);
      if (data.organizerId) {
        setOrganizerId(data.organizerId);
      }
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    let filtered = [...attendees];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower) ||
          a.phone?.includes(search)
      );
    }

    if (filters.has_check_in !== undefined) {
      filtered = filtered.filter((a) =>
        filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0
      );
    }

    if (filters.is_vip !== undefined) {
      filtered = filtered.filter((a) =>
        filters.is_vip ? (a.is_organizer_vip || a.is_global_vip) : !a.is_organizer_vip && !a.is_global_vip
      );
    }

    return filtered;
  }, [search, filters, attendees]);

  const toggleOrganizerVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    if (!organizerId) {
      alert("Organizer ID not found");
      return;
    }

    setTogglingVipId(attendeeId);
    try {
      if (isCurrentlyVip) {
        const response = await fetch(
          `/api/organizer/attendees/${attendeeId}/vip?organizerId=${organizerId}`,
          { method: "DELETE" }
        );
        if (!response.ok) throw new Error("Failed to remove VIP");
      } else {
        const response = await fetch(`/api/organizer/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizerId }),
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
    const vips = attendees.filter(a => a.is_organizer_vip || a.is_global_vip).length;
    const checkedIn = attendees.filter(a => a.total_check_ins > 0).length;
    return { total, vips, checkedIn };
  }, [attendees]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
            Attendee Database
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            All attendees who have registered or checked in to your events
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled title="Export disabled to protect privacy">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>
      </div>

      {/* Privacy Notice */}
      <div className="p-3 bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/20 rounded-lg">
        <p className="text-xs text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">Privacy Protection:</strong> Contact details are masked.
          Use messaging features to communicate with your audience.
        </p>
      </div>

      {/* Stats Chips */}
      <div className="flex flex-wrap gap-2">
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">{stats.total}</span>
          <span className="text-xs text-[var(--text-muted)]">Total</span>
        </div>
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--accent-secondary)]">{stats.vips}</span>
          <span className="text-xs text-[var(--text-muted)]">VIPs</span>
        </div>
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--accent-success)]">{stats.checkedIn}</span>
          <span className="text-xs text-[var(--text-muted)]">Attended</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
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
              className={`px-2.5 py-1 text-[10px] rounded-md flex items-center gap-1 transition-colors ${
                filters.has_check_in === true
                  ? "bg-[var(--accent-success)] text-white"
                  : "bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Filter className="h-3 w-3" />
              Checked In
            </button>
            <button
              onClick={() =>
                setFilters({
                  ...filters,
                  is_vip: filters.is_vip === true ? undefined : true,
                })
              }
              className={`px-2.5 py-1 text-[10px] rounded-md flex items-center gap-1 transition-colors ${
                filters.is_vip === true
                  ? "bg-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] border border-[var(--accent-secondary)]/50"
                  : "bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--accent-secondary)]"
              }`}
            >
              <Crown className="h-3 w-3" />
              VIP
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      {/* Attendees List */}
      <AttendeesDashboardList
        attendees={filteredAttendees}
        role="organizer"
        entityId={organizerId}
        onSelectAttendee={(a) => setSelectedAttendeeId(a.id)}
        onToggleVip={toggleOrganizerVip}
        togglingVipId={togglingVipId}
        isLoading={loading}
      />

      <AttendeeDetailModal
        isOpen={!!selectedAttendeeId}
        onClose={() => setSelectedAttendeeId(null)}
        attendeeId={selectedAttendeeId || ""}
        role="organizer"
      />
    </div>
  );
}
