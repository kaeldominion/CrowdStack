"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Input, Modal, Badge, InlineSpinner } from "@crowdstack/ui";
import { Users, Download, Plus, Upload, User, Phone, Mail, Instagram, Calendar, CheckCircle2, X, Loader2, Crown, Building2, Star } from "lucide-react";
import { AddAttendeeModal } from "@/components/AddAttendeeModal";
import { ImportCSVModal } from "@/components/ImportCSVModal";
import { AttendeesDashboardList } from "@/components/dashboard/AttendeesDashboardList";
import type { DashboardAttendee } from "@/components/dashboard/AttendeesDashboardList";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function AdminAttendeesPage() {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<any | null>(null);
  const [attendeeEvents, setAttendeeEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [vipData, setVipData] = useState<any>(null);
  const [loadingVip, setLoadingVip] = useState(false);
  const [updatingVip, setUpdatingVip] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string>("");
  const [vipReason, setVipReason] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when search changes
  useEffect(() => {
    setAttendees([]);
    setPagination(null);
    setLoading(true);
    loadAttendees(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadAttendees = async (page: number = 1, searchQuery: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/admin/attendees?${params}`);
      if (!response.ok) throw new Error("Failed to load attendees");
      const data = await response.json();

      if (page === 1) {
        setAttendees(data.attendees || []);
      } else {
        setAttendees(prev => [...prev, ...(data.attendees || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading attendees:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadAttendees(pagination.page + 1, debouncedSearch);
  }, [loadingMore, pagination, debouncedSearch]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination, loadingMore, loadMore]);

  const loadAttendeeEvents = async (attendeeId: string) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/admin/attendees/${attendeeId}/events`);
      if (response.ok) {
        const data = await response.json();
        setAttendeeEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading attendee events:", error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadVipData = async (attendeeId: string) => {
    setLoadingVip(true);
    try {
      const response = await fetch(`/api/admin/attendees/${attendeeId}/vip`);
      if (response.ok) {
        const data = await response.json();
        setVipData(data);
      }
    } catch (error) {
      console.error("Error loading VIP data:", error);
    } finally {
      setLoadingVip(false);
    }
  };

  const updateVip = async (action: "add" | "remove", type: "global" | "venue" | "organizer", entityId?: string) => {
    if (!selectedAttendee) return;
    setUpdatingVip(true);
    try {
      const response = await fetch(`/api/admin/attendees/${selectedAttendee.id}/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type, entityId, reason: vipReason || undefined }),
      });
      if (response.ok) {
        await loadVipData(selectedAttendee.id);
        setVipReason("");
        setSelectedVenueId("");
        setSelectedOrganizerId("");
      }
    } catch (error) {
      console.error("Error updating VIP:", error);
    } finally {
      setUpdatingVip(false);
    }
  };

  const handleSelectAttendee = (attendee: any) => {
    setSelectedAttendee(attendee);
    setAttendeeEvents([]);
    setVipData(null);
    loadAttendeeEvents(attendee.id);
    loadVipData(attendee.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
            Attendee Database
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Comprehensive view of all attendees across all venues and events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Import
          </Button>
          <Button variant="secondary" size="sm" onClick={() => {}}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl p-3">
        <Input
          placeholder="Search attendees by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Results Count */}
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Showing {attendees.length} of {pagination?.total || 0} attendees
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </div>

      {/* Attendees List */}
      <AttendeesDashboardList
        attendees={attendees as DashboardAttendee[]}
        role="admin"
        onSelectAttendee={handleSelectAttendee}
        isLoading={loading}
      />

      {/* Infinite Scroll Trigger */}
      <div
        ref={loadMoreRef}
        className="py-4 flex items-center justify-center"
      >
        {loadingMore && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading more...</span>
          </div>
        )}
        {!loadingMore && pagination?.hasMore && (
          <Button variant="ghost" size="sm" onClick={loadMore}>
            Load More
          </Button>
        )}
        {!pagination?.hasMore && attendees.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            All {pagination?.total || attendees.length} attendees loaded
          </p>
        )}
      </div>

      {/* Attendee Profile Modal */}
      <Modal
        isOpen={!!selectedAttendee}
        onClose={() => setSelectedAttendee(null)}
        title="Attendee Profile"
        size="lg"
      >
        {selectedAttendee && (
          <div className="space-y-4">
            {/* Header with Avatar */}
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                {selectedAttendee.avatar_url ? (
                  <img
                    src={selectedAttendee.avatar_url}
                    alt={selectedAttendee.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {selectedAttendee.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {selectedAttendee.name} {selectedAttendee.surname || ""}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedAttendee.user_id ? (
                    <Badge variant="success" className="text-[10px]">Linked</Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]">Guest</Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{selectedAttendee.events_count || 0} Events</Badge>
                  <Badge variant="secondary" className="text-[10px]">{selectedAttendee.checkins_count || 0} Check-ins</Badge>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAttendee.email && (
                  <a
                    href={`mailto:${selectedAttendee.email}`}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span className="truncate">{selectedAttendee.email}</span>
                  </a>
                )}
                {(selectedAttendee.phone || selectedAttendee.whatsapp) && (
                  <a
                    href={`tel:${selectedAttendee.whatsapp || selectedAttendee.phone}`}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{selectedAttendee.whatsapp || selectedAttendee.phone}</span>
                  </a>
                )}
                {selectedAttendee.instagram_handle && (
                  <a
                    href={`https://instagram.com/${selectedAttendee.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Instagram className="h-3.5 w-3.5 text-pink-500" />
                    <span className="text-pink-500">@{selectedAttendee.instagram_handle}</span>
                  </a>
                )}
              </div>
            </div>

            {/* VIP Management */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">VIP Status</p>
              </div>

              {loadingVip ? (
                <div className="flex items-center gap-2 py-4">
                  <InlineSpinner size="sm" />
                  <span className="text-xs text-[var(--text-secondary)]">Loading VIP status...</span>
                </div>
              ) : vipData ? (
                <div className="space-y-3">
                  {/* Global VIP */}
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-[var(--text-primary)]">Global VIP</span>
                      </div>
                      {vipData.globalVip.isVip ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateVip("remove", "global")}
                          disabled={updatingVip}
                          className="h-6 text-[10px]"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => updateVip("add", "global")}
                          disabled={updatingVip}
                          className="h-6 text-[10px]"
                        >
                          <Crown className="h-3 w-3 mr-1" />
                          Grant
                        </Button>
                      )}
                    </div>
                    {vipData.globalVip.isVip && vipData.globalVip.reason && (
                      <p className="text-[10px] text-amber-400 mt-1">{vipData.globalVip.reason}</p>
                    )}
                  </div>

                  {/* Venue VIPs */}
                  <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">Venue VIP</span>
                    </div>
                    {(vipData.venueVips || []).length > 0 && (
                      <div className="space-y-1 mb-2">
                        {(vipData.venueVips || []).map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between text-[10px] p-1.5 bg-white/5 rounded">
                            <span className="truncate">{v.venueName}</span>
                            <button
                              onClick={() => updateVip("remove", "venue", v.venueId)}
                              disabled={updatingVip}
                              className="p-1 text-[var(--text-muted)] hover:text-red-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <select
                        value={selectedVenueId}
                        onChange={(e) => setSelectedVenueId(e.target.value)}
                        className="flex-1 text-[10px] p-1.5 rounded bg-[var(--bg-void)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      >
                        <option value="">Select venue...</option>
                        {(vipData.availableVenues || [])
                          .filter((v: any) => !(vipData.venueVips || []).some((vv: any) => vv.venueId === v.id))
                          .map((v: any) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => selectedVenueId && updateVip("add", "venue", selectedVenueId)}
                        disabled={!selectedVenueId || updatingVip}
                        className="h-6 text-[10px]"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Organizer VIPs */}
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">Organizer VIP</span>
                    </div>
                    {(vipData.organizerVips || []).length > 0 && (
                      <div className="space-y-1 mb-2">
                        {(vipData.organizerVips || []).map((o: any) => (
                          <div key={o.id} className="flex items-center justify-between text-[10px] p-1.5 bg-white/5 rounded">
                            <span className="truncate">{o.organizerName}</span>
                            <button
                              onClick={() => updateVip("remove", "organizer", o.organizerId)}
                              disabled={updatingVip}
                              className="p-1 text-[var(--text-muted)] hover:text-red-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <select
                        value={selectedOrganizerId}
                        onChange={(e) => setSelectedOrganizerId(e.target.value)}
                        className="flex-1 text-[10px] p-1.5 rounded bg-[var(--bg-void)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      >
                        <option value="">Select organizer...</option>
                        {(vipData.availableOrganizers || [])
                          .filter((o: any) => !(vipData.organizerVips || []).some((vo: any) => vo.organizerId === o.id))
                          .map((o: any) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => selectedOrganizerId && updateVip("add", "organizer", selectedOrganizerId)}
                        disabled={!selectedOrganizerId || updatingVip}
                        className="h-6 text-[10px]"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* VIP Reason Input */}
                  <div>
                    <label className="text-[10px] text-[var(--text-muted)]">Reason (optional)</label>
                    <Input
                      value={vipReason}
                      onChange={(e) => setVipReason(e.target.value)}
                      placeholder="e.g., Press, Sponsor..."
                      className="mt-1 h-7 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">Unable to load VIP data</p>
              )}
            </div>

            {/* Event History */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Event History</p>
              {loadingEvents ? (
                <div className="flex items-center gap-2 py-4">
                  <InlineSpinner size="sm" />
                  <span className="text-xs text-[var(--text-secondary)]">Loading events...</span>
                </div>
              ) : attendeeEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {attendeeEvents.map((event: any) => (
                    <div
                      key={event.registration_id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{event.event_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {event.venue_name} • {new Date(event.event_date).toLocaleDateString()}
                        </p>
                      </div>
                      {event.checked_in ? (
                        <Badge variant="success" className="text-[10px] flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          In
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">Reg</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">No events found</p>
              )}
            </div>

            {/* Record Details */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Details</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Created</p>
                  <p className="text-[var(--text-primary)]">
                    {new Date(selectedAttendee.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">ID</p>
                  <p className="text-[var(--text-primary)] font-mono text-[10px] truncate">{selectedAttendee.id}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" size="sm" onClick={() => setSelectedAttendee(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <AddAttendeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setAttendees([]);
          setPagination(null);
          setLoading(true);
          loadAttendees(1, debouncedSearch);
        }}
      />

      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setAttendees([]);
          setPagination(null);
          setLoading(true);
          loadAttendees(1, debouncedSearch);
        }}
      />
    </div>
  );
}
