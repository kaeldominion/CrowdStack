"use client";

import { useState, useEffect, useMemo } from "react";
import { Input, Button, Tabs, TabsList, TabsTrigger } from "@crowdstack/ui";
import { Download, TrendingUp } from "lucide-react";
import type { PromoterAttendee } from "@/lib/data/attendees-promoter";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { AttendeesDashboardList } from "@/components/dashboard/AttendeesDashboardList";

export default function PromoterAttendeesPage() {
  const [attendees, setAttendees] = useState<PromoterAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [category, setCategory] = useState<"upcoming" | "all">("all");

  useEffect(() => {
    loadAttendees();
  }, [category]);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/promoter/attendees", window.location.origin);
      if (category !== "all") {
        url.searchParams.set("category", category);
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();
      setAttendees(data);
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    if (!search) return attendees;

    const searchLower = search.toLowerCase();
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        a.email?.toLowerCase().includes(searchLower) ||
        a.phone?.includes(search)
    );
  }, [search, attendees]);

  // Stats
  const stats = useMemo(() => {
    const total = attendees.length;
    const totalReferrals = attendees.reduce((sum, a) => sum + (a.referral_count || 0), 0);
    const upcoming = attendees.reduce((sum, a) => sum + (a.upcoming_signups || 0), 0);
    const totalCheckins = attendees.reduce((sum, a) => sum + (a.total_check_ins || 0), 0);
    return { total, totalReferrals, upcoming, totalCheckins };
  }, [attendees]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
            My Attendees
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            People who registered through your referrals
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
          <strong className="text-[var(--text-primary)]">Privacy Protection:</strong> You're viewing attendees who registered through your referrals.
          Contact details are masked for security.
        </p>
      </div>

      {/* Stats Chips */}
      <div className="flex flex-wrap gap-2">
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">{stats.total}</span>
          <span className="text-xs text-[var(--text-muted)]">People</span>
        </div>
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--accent-success)]">{stats.totalReferrals}</span>
          <span className="text-xs text-[var(--text-muted)]">Referrals</span>
        </div>
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--accent-primary)]">{stats.upcoming}</span>
          <span className="text-xs text-[var(--text-muted)]">Upcoming</span>
        </div>
        <div className="px-3 py-1.5 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--accent-secondary)]">{stats.totalCheckins}</span>
          <span className="text-xs text-[var(--text-muted)]">Check-ins</span>
        </div>
      </div>

      {/* Search and Category Tabs */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-3">
        <Tabs value={category} onValueChange={(v) => setCategory(v as "all" | "upcoming")}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">All Referrals</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Upcoming Events
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Results Count */}
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Showing {filteredAttendees.length} of {attendees.length} attendees
      </div>

      {/* Attendees List */}
      <AttendeesDashboardList
        attendees={filteredAttendees}
        role="promoter"
        onSelectAttendee={(a) => setSelectedAttendeeId(a.id)}
        isLoading={loading}
      />

      <AttendeeDetailModal
        isOpen={!!selectedAttendeeId}
        onClose={() => setSelectedAttendeeId(null)}
        attendeeId={selectedAttendeeId || ""}
        role="promoter"
      />
    </div>
  );
}
