"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Input, Modal, InlineSpinner, Select } from "@crowdstack/ui";
import {
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  Copy,
  ExternalLink,
  RefreshCw,
  Link as LinkIcon,
  Plus,
  Trash2,
  Calculator,
  TrendingUp,
  UserPlus,
  Repeat,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";
import { PartyGuestsModal } from "./PartyGuestsModal";
import { CloseoutPanel } from "./CloseoutPanel";
import { CommissionSummary } from "./CommissionSummary";

interface TableBooking {
  id: string;
  event_id: string;
  table_id: string;
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size: number;
  special_requests: string | null;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  deposit_required: number | null;
  deposit_received: boolean;
  deposit_received_at: string | null;
  minimum_spend: number | null;
  actual_spend: number | null;
  staff_notes: string | null;
  promoter_id: string | null;
  referral_code: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // Timeslot fields
  slot_start_time: string | null;
  slot_end_time: string | null;
  arrival_deadline: string | null;
  table: {
    id: string;
    name: string;
    capacity: number;
    zone: {
      id: string;
      name: string;
    };
  };
  promoter?: {
    id: string;
    name: string | null;
    slug: string | null;
  } | null;
}

interface TableOption {
  id: string;
  name: string;
  capacity: number;
  zone: {
    id: string;
    name: string;
  };
}

interface BookingLink {
  id: string;
  event_id: string;
  table_id: string | null;
  code: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  table: {
    id: string;
    name: string;
    zone: {
      id: string;
      name: string;
    };
  } | null;
}

interface BookingsTabProps {
  eventId: string;
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
type TabType = "bookings" | "closeout" | "commissions";

export function BookingsTab({ eventId }: BookingsTabProps) {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [allTables, setAllTables] = useState<TableOption[]>([]);
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

  // Selected booking for detail modal
  const [selectedBooking, setSelectedBooking] = useState<TableBooking | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Edit state for the detail modal
  const [editActualSpend, setEditActualSpend] = useState<string>("");
  const [editStaffNotes, setEditStaffNotes] = useState<string>("");
  const [editTableId, setEditTableId] = useState<string>("");

  // Booking links state
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [newLinkTableId, setNewLinkTableId] = useState<string>("any");
  const [newLinkExpiry, setNewLinkExpiry] = useState<string>("");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("bookings");

  // Party guests modal state
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyBookingId, setPartyBookingId] = useState<string | null>(null);
  const [partyBookingName, setPartyBookingName] = useState<string>("");
  const [partyTableName, setPartyTableName] = useState<string>("");

  // Reassignment modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignBookingId, setReassignBookingId] = useState<string | null>(null);
  const [reassignTableName, setReassignTableName] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignForm, setReassignForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_whatsapp: "",
    party_size: 2,
    special_requests: "",
    staff_notes: "",
  });

  useEffect(() => {
    fetchBookings();
  }, [eventId, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const url = `/api/venue/events/${eventId}/bookings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bookings");
      }

      setBookings(data.bookings || []);
      setSummary(data.summary || { total: 0, pending: 0, confirmed: 0, cancelled: 0, no_show: 0, completed: 0 });
      setCurrency(data.currency || "USD");
      setAllTables(data.allTables || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingLinks = async () => {
    try {
      const response = await fetch(`/api/venue/events/${eventId}/booking-links`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch booking links");
      }

      setBookingLinks(data.links || []);
    } catch (err: any) {
      console.error("Error fetching booking links:", err);
    }
  };

  const createBookingLink = async () => {
    try {
      setCreatingLink(true);

      const body: { table_id?: string; expires_at?: string } = {};
      if (newLinkTableId !== "any") {
        body.table_id = newLinkTableId;
      }
      if (newLinkExpiry) {
        body.expires_at = new Date(newLinkExpiry).toISOString();
      }

      const response = await fetch(`/api/venue/events/${eventId}/booking-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create booking link");
      }

      // Refresh the links list
      await fetchBookingLinks();

      // Reset form and close modal
      setNewLinkTableId("any");
      setNewLinkExpiry("");
      setShowCreateLinkModal(false);
    } catch (err: any) {
      console.error("Error creating booking link:", err);
    } finally {
      setCreatingLink(false);
    }
  };

  const deleteBookingLink = async (linkId: string) => {
    try {
      setDeletingLinkId(linkId);

      const response = await fetch(`/api/venue/events/${eventId}/booking-links/${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deactivate booking link");
      }

      // Refresh the links list
      await fetchBookingLinks();
    } catch (err: any) {
      console.error("Error deleting booking link:", err);
    } finally {
      setDeletingLinkId(null);
    }
  };

  const copyLinkToClipboard = async (link: BookingLink) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}/book/${link.code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const openBookingDetail = (booking: TableBooking) => {
    setSelectedBooking(booking);
    setEditActualSpend(booking.actual_spend?.toString() || "");
    setEditStaffNotes(booking.staff_notes || "");
    setEditTableId(booking.table_id);
    setUpdateError(null);
    setShowDetailModal(true);
  };

  const updateBooking = async (updates: {
    status?: string;
    table_id?: string;
    deposit_received?: boolean;
    actual_spend?: number | null;
    staff_notes?: string;
  }) => {
    if (!selectedBooking) return;

    try {
      setUpdating(true);
      setUpdateError(null);

      const response = await fetch(`/api/venue/events/${eventId}/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update booking");
      }

      // Refresh the list
      await fetchBookings();

      // Update the selected booking
      if (data.booking) {
        setSelectedBooking(data.booking);
        setEditActualSpend(data.booking.actual_spend?.toString() || "");
        setEditStaffNotes(data.booking.staff_notes || "");
        setEditTableId(data.booking.table_id);
      }
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateBooking({ status: newStatus });
  };

  const handleDepositToggle = async () => {
    if (!selectedBooking) return;
    await updateBooking({ deposit_received: !selectedBooking.deposit_received });
  };

  const handleTableChange = async () => {
    if (!selectedBooking || editTableId === selectedBooking.table_id) return;
    await updateBooking({ table_id: editTableId });
  };

  const handleSaveNotes = async () => {
    await updateBooking({ staff_notes: editStaffNotes });
  };

  const handleSaveSpend = async () => {
    const spend = editActualSpend ? parseFloat(editActualSpend) : null;
    await updateBooking({ actual_spend: spend });
  };

  // Handle opening the reassign modal
  const openReassignModal = (booking: TableBooking) => {
    setReassignBookingId(booking.id);
    setReassignTableName(booking.table?.name || "Table");
    setReassignForm({
      guest_name: "",
      guest_email: "",
      guest_whatsapp: "",
      party_size: booking.party_size,
      special_requests: "",
      staff_notes: `Reassigned from ${booking.guest_name} (no-show)`,
    });
    setShowReassignModal(true);
  };

  // Handle table reassignment
  const handleReassign = async () => {
    if (!reassignBookingId) return;
    if (!reassignForm.guest_name || !reassignForm.guest_email || !reassignForm.guest_whatsapp) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setReassigning(true);
      const response = await fetch(
        `/api/venue/events/${eventId}/bookings/${reassignBookingId}/reassign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reassignForm),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reassign table");
      }

      // Refresh bookings
      await fetchBookings();
      setShowReassignModal(false);
      setReassignBookingId(null);
      setReassignForm({
        guest_name: "",
        guest_email: "",
        guest_whatsapp: "",
        party_size: 2,
        special_requests: "",
        staff_notes: "",
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReassigning(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { color: "amber" | "green" | "red" | "slate" | "blue"; label: string }> = {
      pending: { color: "amber", label: "Pending" },
      confirmed: { color: "green", label: "Confirmed" },
      cancelled: { color: "slate", label: "Cancelled" },
      no_show: { color: "red", label: "No Show" },
      completed: { color: "blue", label: "Completed" },
    };
    const style = styles[status] || { color: "slate", label: status };
    return <Badge color={style.color}>{style.label}</Badge>;
  };

  const formatWhatsAppLink = (number: string) => {
    // Remove non-numeric characters except +
    const cleaned = number.replace(/[^\d+]/g, "");
    return `https://wa.me/${cleaned.replace("+", "")}`;
  };

  const openPartyModal = (booking: TableBooking) => {
    setPartyBookingId(booking.id);
    setPartyBookingName(booking.guest_name);
    setPartyTableName(booking.table.name);
    setShowPartyModal(true);
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <InlineSpinner className="mx-auto" />
        <p className="mt-2 text-sm text-gray-400">Loading bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-400">{error}</p>
        <Button onClick={fetchBookings} className="mt-4" variant="secondary" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Table Bookings</h3>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "bookings"
                  ? "bg-purple-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-1.5" />
              Bookings
            </button>
            <button
              onClick={() => setActiveTab("closeout")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "closeout"
                  ? "bg-purple-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Calculator className="h-4 w-4 inline mr-1.5" />
              Closeout
            </button>
            <button
              onClick={() => setActiveTab("commissions")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "commissions"
                  ? "bg-purple-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-1.5" />
              Commissions
            </button>
          </div>
        </div>
        {activeTab === "bookings" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              fetchBookingLinks();
              setShowLinksModal(true);
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Booking Links
          </Button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "bookings" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => setStatusFilter("pending")}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === "pending" ? "border-yellow-500 bg-yellow-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="text-2xl font-bold text-yellow-400">{summary.pending}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </button>
            <button
              onClick={() => setStatusFilter("confirmed")}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === "confirmed" ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="text-2xl font-bold text-green-400">{summary.confirmed}</p>
              <p className="text-xs text-gray-400">Confirmed</p>
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === "completed" ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="text-2xl font-bold text-blue-400">{summary.completed}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </button>
            <button
              onClick={() => setStatusFilter("cancelled")}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === "cancelled" ? "border-gray-500 bg-gray-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="text-2xl font-bold text-gray-400">{summary.cancelled}</p>
              <p className="text-xs text-gray-400">Cancelled</p>
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`p-4 rounded-lg border transition-all ${
                statusFilter === "all" ? "border-purple-500 bg-purple-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </button>
          </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-gray-700 rounded-lg">
          <Clock className="mx-auto h-8 w-8 text-gray-500" />
          <p className="mt-2 text-sm text-gray-400">
            {statusFilter === "all" ? "No table bookings yet" : `No ${statusFilter} bookings`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 cursor-pointer transition-all"
              onClick={() => openBookingDetail(booking)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{booking.table.name}</h3>
                    <span className="text-sm text-gray-500">({booking.table.zone.name})</span>
                    {getStatusBadge(booking.status)}
                    {booking.deposit_required && (
                      <Badge color={booking.deposit_received ? "green" : "amber"}>
                        {booking.deposit_received ? "Deposit Paid" : "Deposit Pending"}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {booking.guest_name}
                    </span>
                    <span className="flex items-center gap-1">
                      Party of {booking.party_size}
                    </span>
                    {booking.promoter && (
                      <span className="text-purple-400">
                        via @{booking.promoter.slug || booking.promoter.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    {booking.minimum_spend && (
                      <span>
                        Min: {currencySymbol}{booking.minimum_spend.toLocaleString()}
                      </span>
                    )}
                    {booking.actual_spend && (
                      <span className="text-green-400">
                        Spent: {currencySymbol}{booking.actual_spend.toLocaleString()}
                      </span>
                    )}
                    {booking.slot_start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(booking.slot_start_time)}
                        {booking.slot_end_time && ` - ${formatTime(booking.slot_end_time)}`}
                      </span>
                    )}
                    {booking.arrival_deadline && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Arrive by: {formatTime(booking.arrival_deadline)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Reassign button for no-show or confirmed bookings */}
                  {(booking.status === "no_show" || booking.status === "confirmed") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReassignModal(booking);
                      }}
                      className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                      title="Reassign Table"
                    >
                      <Repeat className="h-5 w-5" />
                    </button>
                  )}
                  <a
                    href={formatWhatsAppLink(booking.guest_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    title="Open WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Closeout Tab */}
      {activeTab === "closeout" && (
        <CloseoutPanel eventId={eventId} onRefresh={fetchBookings} />
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <CommissionSummary eventId={eventId} />
      )}

      {/* Booking Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Booking: ${selectedBooking?.table.name}`}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {updateError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {updateError}
              </div>
            )}

            {/* Status & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedBooking.status)}
                {selectedBooking.confirmed_at && (
                  <span className="text-xs text-gray-500">
                    Confirmed {new Date(selectedBooking.confirmed_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {selectedBooking.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("confirmed")}
                    disabled={updating}
                  >
                    {updating ? <InlineSpinner /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {selectedBooking.status === "confirmed" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange("completed")}
                    disabled={updating}
                  >
                    {updating ? <InlineSpinner /> : "Mark Completed"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange("no_show")}
                    disabled={updating}
                  >
                    No Show
                  </Button>
                </div>
              )}
            </div>

            {/* Guest Info */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white">Guest Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Name</p>
                  <p className="text-white">{selectedBooking.guest_name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Party Size</p>
                  <p className="text-white">{selectedBooking.party_size}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <a href={`mailto:${selectedBooking.guest_email}`} className="text-blue-400 hover:underline">
                    {selectedBooking.guest_email}
                  </a>
                </div>
                <div>
                  <p className="text-gray-400">WhatsApp</p>
                  <a
                    href={formatWhatsAppLink(selectedBooking.guest_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:underline flex items-center gap-1"
                  >
                    {selectedBooking.guest_whatsapp}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              {selectedBooking.special_requests && (
                <div>
                  <p className="text-gray-400 text-sm">Special Requests</p>
                  <p className="text-white text-sm">{selectedBooking.special_requests}</p>
                </div>
              )}
              {selectedBooking.promoter && (
                <div>
                  <p className="text-gray-400 text-sm">Referred By</p>
                  <p className="text-purple-400 text-sm">
                    @{selectedBooking.promoter.slug || selectedBooking.promoter.name}
                  </p>
                </div>
              )}
            </div>

            {/* Party Guests - Only show for confirmed/completed bookings */}
            {(selectedBooking.status === "confirmed" || selectedBooking.status === "completed") && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Party Guests</h4>
                      <p className="text-sm text-gray-400">
                        Manage individual guests and send QR invites
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      openPartyModal(selectedBooking);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Party
                  </Button>
                </div>
              </div>
            )}

            {/* Table Selection */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white">Table Assignment</h4>
              <div className="flex items-center gap-3">
                <select
                  value={editTableId}
                  onChange={(e) => setEditTableId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                  disabled={selectedBooking.status === "cancelled" || selectedBooking.status === "no_show"}
                >
                  {allTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.zone.name}) - {table.capacity} seats
                    </option>
                  ))}
                </select>
                {editTableId !== selectedBooking.table_id && (
                  <Button size="sm" onClick={handleTableChange} disabled={updating}>
                    {updating ? <InlineSpinner /> : "Change"}
                  </Button>
                )}
              </div>
            </div>

            {/* Financial */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-white">Financial</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Minimum Spend</p>
                  <p className="text-white">
                    {selectedBooking.minimum_spend
                      ? `${currencySymbol}${selectedBooking.minimum_spend.toLocaleString()}`
                      : "None"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Deposit Required</p>
                  <p className="text-white">
                    {selectedBooking.deposit_required
                      ? `${currencySymbol}${selectedBooking.deposit_required.toLocaleString()}`
                      : "None"}
                  </p>
                </div>
              </div>

              {selectedBooking.deposit_required && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deposit-received"
                      checked={selectedBooking.deposit_received}
                      onChange={handleDepositToggle}
                      disabled={updating}
                      className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                    <label htmlFor="deposit-received" className="text-sm text-white">
                      Deposit Received
                    </label>
                  </div>
                  {selectedBooking.deposit_received_at && (
                    <span className="text-xs text-gray-500">
                      {new Date(selectedBooking.deposit_received_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {(selectedBooking.status === "confirmed" || selectedBooking.status === "completed") && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Actual Spend</p>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={editActualSpend}
                        onChange={(e) => setEditActualSpend(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                    {editActualSpend !== (selectedBooking.actual_spend?.toString() || "") && (
                      <Button size="sm" onClick={handleSaveSpend} disabled={updating}>
                        {updating ? <InlineSpinner /> : "Save"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Staff Notes */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Staff Notes</label>
              <textarea
                value={editStaffNotes}
                onChange={(e) => setEditStaffNotes(e.target.value)}
                placeholder="Internal notes about this booking..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                rows={3}
              />
              {editStaffNotes !== (selectedBooking.staff_notes || "") && (
                <Button size="sm" onClick={handleSaveNotes} disabled={updating}>
                  {updating ? <InlineSpinner /> : "Save Notes"}
                </Button>
              )}
            </div>

            {/* Timestamps */}
            <div className="text-xs text-gray-500 pt-4 border-t border-gray-700">
              <p>Requested: {new Date(selectedBooking.created_at).toLocaleString()}</p>
              <p>Last Updated: {new Date(selectedBooking.updated_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Links Modal */}
      <Modal
        isOpen={showLinksModal}
        onClose={() => setShowLinksModal(false)}
        title="Booking Links"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Generate shareable links for direct table booking
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateLinkModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Generate Link
            </Button>
          </div>

          {bookingLinks.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-gray-700 rounded-lg">
              <LinkIcon className="mx-auto h-8 w-8 text-gray-500" />
              <p className="mt-2 text-sm text-gray-400">No booking links generated yet</p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowCreateLinkModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Generate First Link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookingLinks.filter(l => l.is_active).map((link) => (
                <div
                  key={link.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm text-purple-400 bg-gray-900 px-2 py-1 rounded">
                        /book/{link.code}
                      </code>
                      {link.table ? (
                        <Badge color="blue">
                          {link.table.name}
                        </Badge>
                      ) : (
                        <Badge color="slate">
                          Any Table
                        </Badge>
                      )}
                      {link.expires_at && (
                        <span className="text-xs text-gray-500">
                          Expires: {new Date(link.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyLinkToClipboard(link)}
                    >
                      {copiedLinkId === link.id ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteBookingLink(link.id)}
                      disabled={deletingLinkId === link.id}
                    >
                      {deletingLinkId === link.id ? (
                        <InlineSpinner />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-400" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Booking Link Modal */}
      <Modal
        isOpen={showCreateLinkModal}
        onClose={() => {
          setShowCreateLinkModal(false);
          setNewLinkTableId("any");
          setNewLinkExpiry("");
        }}
        title="Generate Booking Link"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Table</label>
            <select
              value={newLinkTableId}
              onChange={(e) => setNewLinkTableId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            >
              <option value="any">Any available table</option>
              {allTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.zone.name})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Select a specific table or allow guest to choose any available table
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300">Expiry Date (Optional)</label>
            <input
              type="date"
              value={newLinkExpiry}
              onChange={(e) => setNewLinkExpiry(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <p className="text-xs text-gray-500">
              Leave blank for no expiry
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateLinkModal(false);
                setNewLinkTableId("any");
                setNewLinkExpiry("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={createBookingLink} disabled={creatingLink}>
              {creatingLink ? (
                <>
                  <InlineSpinner />
                  <span className="ml-2">Creating...</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Link
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Party Guests Modal */}
      {partyBookingId && (
        <PartyGuestsModal
          isOpen={showPartyModal}
          onClose={() => {
            setShowPartyModal(false);
            setPartyBookingId(null);
          }}
          eventId={eventId}
          bookingId={partyBookingId}
          bookingName={partyBookingName}
          tableName={partyTableName}
        />
      )}

      {/* Reassign Table Modal */}
      <Modal
        isOpen={showReassignModal}
        onClose={() => {
          setShowReassignModal(false);
          setReassignBookingId(null);
        }}
        title={`Reassign ${reassignTableName}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-sm text-purple-300">
              This will mark the current booking as a no-show and create a new confirmed booking for the same table.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Guest Name *</label>
              <input
                type="text"
                value={reassignForm.guest_name}
                onChange={(e) => setReassignForm({ ...reassignForm, guest_name: e.target.value })}
                placeholder="New guest name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Email *</label>
              <input
                type="email"
                value={reassignForm.guest_email}
                onChange={(e) => setReassignForm({ ...reassignForm, guest_email: e.target.value })}
                placeholder="guest@email.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">WhatsApp *</label>
              <input
                type="tel"
                value={reassignForm.guest_whatsapp}
                onChange={(e) => setReassignForm({ ...reassignForm, guest_whatsapp: e.target.value })}
                placeholder="+1234567890"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Party Size</label>
              <input
                type="number"
                min="1"
                max="20"
                value={reassignForm.party_size}
                onChange={(e) => setReassignForm({ ...reassignForm, party_size: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Staff Notes</label>
              <textarea
                value={reassignForm.staff_notes}
                onChange={(e) => setReassignForm({ ...reassignForm, staff_notes: e.target.value })}
                placeholder="Internal notes..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setShowReassignModal(false);
                setReassignBookingId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReassign} disabled={reassigning}>
              {reassigning ? (
                <>
                  <InlineSpinner />
                  <span className="ml-2">Reassigning...</span>
                </>
              ) : (
                <>
                  <Repeat className="h-4 w-4 mr-2" />
                  Reassign Table
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
