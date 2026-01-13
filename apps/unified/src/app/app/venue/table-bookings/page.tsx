"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Badge, Card, InlineSpinner } from "@crowdstack/ui";
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  RefreshCw,
  Filter,
  ChevronRight,
  X,
  UserCheck,
  UserX,
  Edit2,
  MoreHorizontal,
  QrCode,
  ExternalLink,
  Trash2,
  PartyPopper,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";

interface PartyGuest {
  id: string;
  guest_name: string;
  guest_email: string;
  status: "invited" | "joined" | "declined" | "removed";
  is_host: boolean;
  checked_in: boolean;
}

interface TableBooking {
  id: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  payment_status?: "not_required" | "pending" | "paid" | "refunded";
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size: number;
  special_requests: string | null;
  deposit_required: number | null;
  deposit_received: boolean | null;
  minimum_spend: number | null;
  actual_spend: number | null;
  staff_notes: string | null;
  promoter_id: string | null;
  created_at: string;
  updated_at: string;
  // Guest counts from table_party_guests
  guests_joined?: number;
  guests_checked_in?: number;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    venue_id: string;
    currency: string | null;
  };
  table: {
    id: string;
    name: string;
    capacity?: number;
    zone: {
      id: string;
      name: string;
    } | null;
  } | null;
  promoter: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
}

interface EventOption {
  id: string;
  name: string;
  start_time: string;
  table_booking_mode: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "no_show" | "completed";

export default function VenueTableBookingsPage() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    no_show: 0,
    completed: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  // Selected booking for detail panel
  const [selectedBooking, setSelectedBooking] = useState<TableBooking | null>(null);
  const [partyGuests, setPartyGuests] = useState<PartyGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [updatingDeposit, setUpdatingDeposit] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, eventFilter, upcomingOnly]);

  useEffect(() => {
    if (selectedBooking) {
      fetchPartyGuests(selectedBooking.id);
    }
  }, [selectedBooking]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (eventFilter !== "all") {
        params.set("event_id", eventFilter);
      }
      if (upcomingOnly) {
        params.set("upcoming_only", "true");
      }

      const url = `/api/venue/table-bookings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bookings");
      }

      setBookings(data.bookings || []);
      setSummary(data.summary || { total: 0, pending: 0, confirmed: 0, cancelled: 0, no_show: 0, completed: 0 });
      setCurrency(data.currency || "USD");
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartyGuests = async (bookingId: string) => {
    try {
      setLoadingGuests(true);
      const response = await fetch(`/api/venue/table-bookings/${bookingId}/guests`);
      const data = await response.json();

      if (response.ok) {
        setPartyGuests(data.guests || []);
      }
    } catch (err) {
      console.error("Failed to fetch party guests:", err);
    } finally {
      setLoadingGuests(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      setActionLoading(newStatus);
      const response = await fetch(`/api/venue/table-bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Refresh bookings
      await fetchBookings();

      // Update selected booking if it's the one we changed
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDepositToggle = async () => {
    if (!selectedBooking) return;

    try {
      setUpdatingDeposit(true);
      const response = await fetch(`/api/venue/events/${selectedBooking.event.id}/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deposit_received: !selectedBooking.deposit_received }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update deposit status");
      }

      // Refresh bookings and update selected booking
      await fetchBookings();
      if (selectedBooking) {
        const updatedBooking = { ...selectedBooking, deposit_received: !selectedBooking.deposit_received };
        setSelectedBooking(updatedBooking);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingDeposit(false);
    }
  };

  const handleArchive = async (bookingId: string) => {
    if (!confirm("Are you sure you want to archive this booking? It will be hidden from the list but preserved in the database.")) {
      return;
    }

    try {
      setActionLoading("archive");
      const response = await fetch(`/api/venue/table-bookings/${bookingId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to archive booking");
      }

      // Close panel and refresh list
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, booking?: TableBooking, size: "sm" | "md" = "sm") => {
    // Show more meaningful status based on booking + payment state
    if (booking && status === "pending") {
      if (booking.deposit_required && !booking.deposit_received) {
        return <Badge color="amber" size={size}>Awaiting Payment</Badge>;
      }
      return <Badge color="amber" size={size}>Awaiting Confirmation</Badge>;
    }

    const styles: Record<string, { color: "amber" | "green" | "red" | "slate" | "blue"; label: string }> = {
      pending: { color: "amber", label: "Pending" },
      confirmed: { color: "green", label: "Confirmed" },
      cancelled: { color: "slate", label: "Cancelled" },
      no_show: { color: "red", label: "No Show" },
      completed: { color: "blue", label: "Completed" },
    };
    const style = styles[status] || { color: "slate", label: status };
    return <Badge color={style.color} size={size}>{style.label}</Badge>;
  };

  const getPaymentBadge = (booking: TableBooking) => {
    if (!booking.deposit_required) return null;
    if (booking.deposit_received) {
      return <Badge color="green" size="sm">Paid</Badge>;
    }
    return <Badge color="red" size="sm">Unpaid</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatWhatsAppLink = (number: string) => {
    const cleaned = number.replace(/[^\d+]/g, "");
    return `https://wa.me/${cleaned.replace("+", "")}`;
  };

  const currencySymbol = getCurrencySymbol(currency);

  const joinedGuestsCount = partyGuests.filter(g => g.status === "joined").length;
  const checkedInCount = partyGuests.filter(g => g.checked_in).length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={`flex-1 overflow-auto p-6 transition-all ${selectedBooking ? "mr-96" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <PartyPopper className="h-6 w-6 text-[var(--accent-secondary)]" />
              Table Bookings
            </h1>
            <p className="page-description">
              Manage table reservations across all events
            </p>
          </div>
          <Button onClick={fetchBookings} variant="secondary" size="sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Compact Summary */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "all"
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            All ({summary.total})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "pending"
                ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            Pending ({summary.pending})
          </button>
          <button
            onClick={() => setStatusFilter("confirmed")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "confirmed"
                ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            Confirmed ({summary.confirmed})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "completed"
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            Completed ({summary.completed})
          </button>
          <button
            onClick={() => setStatusFilter("no_show")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "no_show"
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            No Show ({summary.no_show})
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === "cancelled"
                ? "bg-gray-500/20 text-primary ring-1 ring-gray-500/50"
                : "bg-active text-secondary hover:bg-active/80"
            }`}
          >
            Cancelled ({summary.cancelled})
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-2 py-1 bg-active border border-border-subtle rounded text-primary text-xs"
          >
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({formatDate(event.start_time)})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-secondary">
            <input
              type="checkbox"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
              className="rounded bg-active border-border-subtle text-purple-500 h-3 w-3"
            />
            Upcoming only
          </label>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center">
            <InlineSpinner className="mx-auto" />
            <p className="mt-2 text-sm text-secondary">Loading bookings...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto h-6 w-6 text-red-400" />
            <p className="mt-2 text-xs text-red-400">{error}</p>
            <Button onClick={fetchBookings} className="mt-3" variant="secondary" size="sm">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && bookings.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border-subtle rounded-lg">
            <Users className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-2 text-sm text-secondary">No bookings found</p>
          </div>
        )}

        {/* Compact Table View */}
        {!loading && !error && bookings.length > 0 && (
          <div className="bg-glass rounded-lg border border-border-subtle overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle bg-active">
                  <th className="text-left py-2 px-3 font-medium text-secondary">Guest</th>
                  <th className="text-left py-2 px-3 font-medium text-secondary">Table</th>
                  <th className="text-left py-2 px-3 font-medium text-secondary">Event</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Guests</th>
                  <th className="text-left py-2 px-3 font-medium text-secondary">Status</th>
                  <th className="text-right py-2 px-3 font-medium text-secondary">Min Spend</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Deposit</th>
                  <th className="text-left py-2 px-3 font-medium text-secondary">Notes</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Contact</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const totalCapacity = booking.table?.capacity || booking.party_size;
                  const guestsJoined = booking.guests_joined || 0;
                  const spotsLeft = totalCapacity - guestsJoined;
                  const hasNotes = !!(booking.special_requests || booking.staff_notes);
                  
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`border-b border-border-subtle hover:bg-active cursor-pointer transition-colors ${
                        selectedBooking?.id === booking.id ? "bg-purple-500/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="font-medium text-primary">{booking.guest_name}</div>
                        <div className="text-muted truncate max-w-[150px]">{booking.guest_email}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-primary">{booking.table?.name || "—"}</div>
                        <div className="text-muted">{booking.table?.zone?.name || ""}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-primary truncate max-w-[120px]">{booking.event.name}</div>
                        <div className="text-muted">{formatDate(booking.event.start_time)}</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-primary font-medium">
                            {guestsJoined}/{totalCapacity}
                          </span>
                          {spotsLeft > 0 && (
                            <span className="text-[10px] text-muted">
                              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                            </span>
                          )}
                          {spotsLeft === 0 && guestsJoined > 0 && (
                            <span className="text-[10px] text-amber-400">Full</span>
                          )}
                          {(booking.guests_checked_in || 0) > 0 && (
                            <span className="text-green-400 text-[10px]">
                              {booking.guests_checked_in} checked in
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {getStatusBadge(booking.status, booking)}
                      </td>
                      <td className="py-2 px-3 text-right text-primary">
                        {booking.minimum_spend ? `${currencySymbol}${booking.minimum_spend.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {getPaymentBadge(booking) || <span className="text-muted">—</span>}
                      </td>
                      <td className="py-2 px-3">
                        {hasNotes ? (
                          <div className="flex items-center gap-1" title={
                            `${booking.special_requests ? `Special: ${booking.special_requests}` : ""}${booking.special_requests && booking.staff_notes ? "\n" : ""}${booking.staff_notes ? `Staff: ${booking.staff_notes}` : ""}`
                          }>
                            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-[10px] text-muted truncate max-w-[80px]">
                              {booking.special_requests ? "Special" : ""}
                              {booking.special_requests && booking.staff_notes ? " + " : ""}
                              {booking.staff_notes ? "Staff" : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {booking.guest_whatsapp && (
                            <a
                              href={formatWhatsAppLink(booking.guest_whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {booking.guest_email && (
                            <a
                              href={`mailto:${booking.guest_email}`}
                              className="p-1.5 rounded hover:bg-blue-500/20 text-blue-400 transition-colors"
                              title="Email"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Slide-out Panel */}
      {selectedBooking && (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-glass border-l border-border-subtle overflow-y-auto shadow-xl z-40">
          {/* Panel Header */}
          <div className="sticky top-0 bg-glass border-b border-border-subtle p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-primary">{selectedBooking.guest_name}</h2>
              <p className="text-xs text-secondary">{selectedBooking.table?.name} • {selectedBooking.table?.zone?.name}</p>
            </div>
            <button
              onClick={() => setSelectedBooking(null)}
              className="p-1.5 rounded-lg hover:bg-active text-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Status & Quick Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedBooking.status, selectedBooking, "md")}
                {getPaymentBadge(selectedBooking)}
              </div>
            </div>

            {/* Status Actions */}
            {selectedBooking.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleStatusChange(selectedBooking.id, "confirmed")}
                  disabled={actionLoading !== null}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {actionLoading === "confirmed" ? <InlineSpinner /> : <CheckCircle className="h-3 w-3 mr-1" />}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange(selectedBooking.id, "cancelled")}
                  disabled={actionLoading !== null}
                  className="flex-1"
                >
                  {actionLoading === "cancelled" ? <InlineSpinner /> : <XCircle className="h-3 w-3 mr-1" />}
                  Cancel
                </Button>
              </div>
            )}

            {selectedBooking.status === "confirmed" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(selectedBooking.id, "completed")}
                    disabled={actionLoading !== null}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    title="Mark as completed after the event"
                  >
                    {actionLoading === "completed" ? <InlineSpinner /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange(selectedBooking.id, "no_show")}
                    disabled={actionLoading !== null}
                    className="flex-1"
                  >
                    {actionLoading === "no_show" ? <InlineSpinner /> : <UserX className="h-3 w-3 mr-1" />}
                    No Show
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this booking?" + (selectedBooking.deposit_received ? " A refund may be required." : ""))) {
                      handleStatusChange(selectedBooking.id, "cancelled");
                    }
                  }}
                  disabled={actionLoading !== null}
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  {actionLoading === "cancelled" ? <InlineSpinner /> : <XCircle className="h-3 w-3 mr-1" />}
                  Cancel Booking
                </Button>
                <p className="text-[10px] text-muted text-center">
                  Complete = Party attended & finished • No Show = Didn't arrive
                </p>
              </div>
            )}

            {/* Deposit Payment Action */}
            <div className="bg-active rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted" />
                  <span className="text-sm font-medium text-primary">Deposit Payment</span>
                </div>
                {selectedBooking.deposit_received ? (
                  <Badge color="green" size="sm">Paid</Badge>
                ) : (
                  <Badge color="amber" size="sm">Unpaid</Badge>
                )}
              </div>
              {selectedBooking.deposit_required && (
                <p className="text-xs text-secondary mb-2">
                  Amount: {currencySymbol}{selectedBooking.deposit_required.toLocaleString()}
                </p>
              )}
              <Button
                size="sm"
                onClick={handleDepositToggle}
                disabled={updatingDeposit || actionLoading !== null}
                className={`w-full ${
                  selectedBooking.deposit_received
                    ? "bg-active hover:bg-active/80"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {updatingDeposit ? (
                  <InlineSpinner />
                ) : selectedBooking.deposit_received ? (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Mark as Unpaid
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark Deposit Paid
                  </>
                )}
              </Button>
            </div>

            {/* Contact Actions */}
            <div className="flex gap-2">
              <a
                href={formatWhatsAppLink(selectedBooking.guest_whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs"
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </a>
              <a
                href={`mailto:${selectedBooking.guest_email}`}
                className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            </div>

            {/* Booking Details */}
            <div className="bg-active rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Event</span>
                <Link href={`/e/${selectedBooking.event.slug}`} className="text-purple-400 hover:underline">
                  {selectedBooking.event.name}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Date</span>
                <span className="text-primary">{formatDate(selectedBooking.event.start_time)} at {formatTime(selectedBooking.event.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Guests</span>
                <span className="text-primary">
                  {selectedBooking.guests_joined || 0}/{selectedBooking.table?.capacity || selectedBooking.party_size} registered
                  {(selectedBooking.guests_checked_in || 0) > 0 && (
                    <span className="text-green-400 ml-1">• {selectedBooking.guests_checked_in} checked in</span>
                  )}
                </span>
              </div>
              {selectedBooking.minimum_spend && (
                <div className="flex justify-between">
                  <span className="text-secondary">Minimum Spend</span>
                  <span className="text-primary">{currencySymbol}{selectedBooking.minimum_spend.toLocaleString()}</span>
                </div>
              )}
              {selectedBooking.deposit_required ? (
                <div className="flex justify-between">
                  <span className="text-secondary">Deposit</span>
                  <span className={selectedBooking.deposit_received ? "text-green-400" : "text-amber-400"}>
                    {currencySymbol}{selectedBooking.deposit_required.toLocaleString()}
                    {selectedBooking.deposit_received ? " (Paid)" : " (Pending)"}
                  </span>
                </div>
              ) : null}
              {selectedBooking.actual_spend && (
                <div className="flex justify-between">
                  <span className="text-secondary">Actual Spend</span>
                  <span className="text-green-400">{currencySymbol}{selectedBooking.actual_spend.toLocaleString()}</span>
                </div>
              )}
              {selectedBooking.promoter && (
                <div className="flex justify-between">
                  <span className="text-secondary">Promoter</span>
                  <span className="text-purple-400">@{selectedBooking.promoter.slug || selectedBooking.promoter.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-secondary">Booked</span>
                <span className="text-primary">{new Date(selectedBooking.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Special Requests */}
            {selectedBooking.special_requests && (
              <div className="bg-active rounded-lg p-3">
                <h4 className="text-xs font-medium text-secondary mb-1">Special Requests</h4>
                <p className="text-xs text-primary">{selectedBooking.special_requests}</p>
              </div>
            )}

            {/* Staff Notes */}
            {selectedBooking.staff_notes && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <h4 className="text-xs font-medium text-amber-400 mb-1">Staff Notes</h4>
                <p className="text-xs text-primary">{selectedBooking.staff_notes}</p>
              </div>
            )}

            {/* Party Guests Section */}
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Party Guests
                </h3>
                <span className="text-xs text-secondary">
                  {joinedGuestsCount}/{selectedBooking.table?.capacity || selectedBooking.party_size} joined • {checkedInCount} checked in
                </span>
              </div>

              {loadingGuests ? (
                <div className="py-4 text-center">
                  <InlineSpinner />
                </div>
              ) : partyGuests.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  No party guests yet
                </div>
              ) : (
                <div className="space-y-2">
                  {partyGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        guest.is_host ? "bg-purple-500/10 border border-purple-500/30" : "bg-active"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {guest.checked_in ? (
                          <UserCheck className="h-3 w-3 text-green-400" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-border-subtle" />
                        )}
                        <div>
                          <div className="text-xs text-primary flex items-center gap-1">
                            {guest.guest_name}
                            {guest.is_host && (
                              <Badge color="purple" size="sm">Host</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted">{guest.guest_email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {guest.status === "joined" ? (
                          <Badge color="green" size="sm">Joined</Badge>
                        ) : guest.status === "invited" ? (
                          <Badge color="amber" size="sm">Invited</Badge>
                        ) : guest.status === "declined" ? (
                          <Badge color="slate" size="sm">Declined</Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View Event Link */}
            <div className="border-t border-border-subtle pt-4 space-y-2">
              <Link
                href={`/app/venue/events/${selectedBooking.event.id}?tab=bookings`}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-active text-secondary hover:bg-active/80 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                View in Event Management
              </Link>

              {/* Archive Button */}
              <button
                onClick={() => handleArchive(selectedBooking.id)}
                disabled={actionLoading !== null}
                className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg border border-border-subtle text-muted hover:text-accent-error hover:border-accent-error/30 hover:bg-accent-error/5 text-xs transition-colors"
              >
                {actionLoading === "archive" ? (
                  <InlineSpinner />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Archive Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
