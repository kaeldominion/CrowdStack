"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, LoadingSpinner, Badge } from "@crowdstack/ui";
import {
  Users,
  Mail,
  Phone,
  Plus,
  Trash2,
  Send,
  QrCode,
  Check,
  Clock,
  X,
  Crown,
  Copy,
  CheckCircle2,
} from "lucide-react";

interface PartyGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  bookingId: string;
  bookingName: string;
  tableName: string;
}

interface PartyGuest {
  id: string;
  booking_id: string;
  attendee_id: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  invite_token: string;
  invite_sent_at: string | null;
  joined_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  status: "invited" | "joined" | "declined" | "removed";
  is_host: boolean;
  created_at: string;
}

interface GuestSummary {
  total: number;
  invited: number;
  joined: number;
  checked_in: number;
}

export function PartyGuestsModal({
  isOpen,
  onClose,
  eventId,
  bookingId,
  bookingName,
  tableName,
}: PartyGuestsModalProps) {
  const [guests, setGuests] = useState<PartyGuest[]>([]);
  const [summary, setSummary] = useState<GuestSummary>({ total: 0, invited: 0, joined: 0, checked_in: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add guest form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);

  // Action states
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [removingGuest, setRemovingGuest] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadGuests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/venue/events/${eventId}/bookings/${bookingId}/guests`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load guests");
      }

      setGuests(data.guests || []);
      setSummary(data.summary || { total: 0, invited: 0, joined: 0, checked_in: 0 });
    } catch (err) {
      console.error("Error loading guests:", err);
      setError(err instanceof Error ? err.message : "Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      loadGuests();
    } else {
      setGuests([]);
      setShowAddForm(false);
      resetAddForm();
    }
  }, [isOpen, bookingId, eventId]);

  const resetAddForm = () => {
    setNewGuestName("");
    setNewGuestEmail("");
    setNewGuestPhone("");
    setError(null);
  };

  const handleAddGuest = async () => {
    if (!newGuestName.trim() || !newGuestEmail.trim()) {
      setError("Name and email are required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newGuestEmail)) {
      setError("Invalid email format");
      return;
    }

    try {
      setAddingGuest(true);
      setError(null);

      const response = await fetch(
        `/api/venue/events/${eventId}/bookings/${bookingId}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_name: newGuestName.trim(),
            guest_email: newGuestEmail.trim().toLowerCase(),
            guest_phone: newGuestPhone.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add guest");
      }

      // Reload guest list
      await loadGuests();
      setShowAddForm(false);
      resetAddForm();
    } catch (err) {
      console.error("Error adding guest:", err);
      setError(err instanceof Error ? err.message : "Failed to add guest");
    } finally {
      setAddingGuest(false);
    }
  };

  const handleResendInvite = async (guestId: string) => {
    try {
      setResendingInvite(guestId);

      const response = await fetch(
        `/api/venue/events/${eventId}/bookings/${bookingId}/guests/${guestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resend_invite: true }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend invite");
      }

      // Show success (briefly update UI)
      await loadGuests();
    } catch (err) {
      console.error("Error resending invite:", err);
      alert(err instanceof Error ? err.message : "Failed to resend invite");
    } finally {
      setResendingInvite(null);
    }
  };

  const handleRemoveGuest = async (guestId: string, guestName: string) => {
    if (!confirm(`Are you sure you want to remove ${guestName} from this party?`)) {
      return;
    }

    try {
      setRemovingGuest(guestId);

      const response = await fetch(
        `/api/venue/events/${eventId}/bookings/${bookingId}/guests/${guestId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove guest");
      }

      // Reload guest list
      await loadGuests();
    } catch (err) {
      console.error("Error removing guest:", err);
      alert(err instanceof Error ? err.message : "Failed to remove guest");
    } finally {
      setRemovingGuest(null);
    }
  };

  const handleCopyLink = async (inviteToken: string) => {
    const link = `${baseUrl}/join-table/${inviteToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(inviteToken);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getStatusBadge = (guest: PartyGuest) => {
    if (guest.checked_in) {
      return (
        <Badge variant="success" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Checked In
        </Badge>
      );
    }
    if (guest.status === "joined") {
      return (
        <Badge variant="success" className="text-xs">
          <Check className="h-3 w-3 mr-1" />
          Joined
        </Badge>
      );
    }
    if (guest.status === "invited") {
      return (
        <Badge variant="warning" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Invited
        </Badge>
      );
    }
    if (guest.status === "declined") {
      return (
        <Badge variant="error" className="text-xs">
          <X className="h-3 w-3 mr-1" />
          Declined
        </Badge>
      );
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Party Guests - ${tableName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header with booking info */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <div>
            <p className="text-sm text-secondary">Hosted by</p>
            <p className="text-lg font-semibold text-primary">{bookingName}</p>
          </div>
          <div className="text-right">
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{summary.total}</p>
                <p className="text-xs text-muted">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-success">{summary.joined}</p>
                <p className="text-xs text-muted">Joined</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent-primary">{summary.checked_in}</p>
                <p className="text-xs text-muted">Checked In</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Guest Button / Form */}
        {showAddForm ? (
          <div className="bg-surface-secondary rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-primary">Add Guest</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetAddForm();
                }}
                className="text-secondary hover:text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Name *
                </label>
                <Input
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Guest name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  placeholder="guest@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">
                  Phone
                </label>
                <Input
                  value={newGuestPhone}
                  onChange={(e) => setNewGuestPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-accent-error">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  resetAddForm();
                }}
                disabled={addingGuest}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddGuest}
                disabled={addingGuest || !newGuestName.trim() || !newGuestEmail.trim()}
              >
                {addingGuest ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Add & Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        )}

        {/* Guest List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : guests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted mb-3" />
              <p className="text-secondary">No guests added yet</p>
              <p className="text-sm text-muted">
                Add guests to send them invitations with their entry QR code
              </p>
            </div>
          ) : (
            guests.map((guest) => (
              <div
                key={guest.id}
                className="bg-surface-secondary rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                    {guest.is_host ? (
                      <Crown className="h-5 w-5 text-accent-warning" />
                    ) : (
                      <Users className="h-5 w-5 text-accent-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-primary">{guest.guest_name}</p>
                      {guest.is_host && (
                        <Badge variant="warning" className="text-xs">Host</Badge>
                      )}
                      {getStatusBadge(guest)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-secondary">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {guest.guest_email}
                      </span>
                      {guest.guest_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {guest.guest_phone}
                        </span>
                      )}
                    </div>
                    {guest.joined_at && (
                      <p className="text-xs text-muted mt-1">
                        Joined {formatDate(guest.joined_at)}
                      </p>
                    )}
                    {guest.checked_in_at && (
                      <p className="text-xs text-accent-success mt-1">
                        Checked in {formatDate(guest.checked_in_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Copy invite link */}
                  {guest.status === "invited" && (
                    <button
                      onClick={() => handleCopyLink(guest.invite_token)}
                      className="p-2 rounded-lg hover:bg-active text-secondary hover:text-primary transition-colors"
                      title="Copy invite link"
                    >
                      {copiedLink === guest.invite_token ? (
                        <Check className="h-4 w-4 text-accent-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* View pass (if joined) */}
                  {guest.status === "joined" && (
                    <a
                      href={`/table-pass/${guest.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-active text-secondary hover:text-primary transition-colors"
                      title="View pass"
                    >
                      <QrCode className="h-4 w-4" />
                    </a>
                  )}

                  {/* Resend invite (if invited and not joined) */}
                  {guest.status === "invited" && (
                    <button
                      onClick={() => handleResendInvite(guest.id)}
                      disabled={resendingInvite === guest.id}
                      className="p-2 rounded-lg hover:bg-active text-secondary hover:text-primary transition-colors disabled:opacity-50"
                      title="Resend invite"
                    >
                      {resendingInvite === guest.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {/* Remove guest (not host) */}
                  {!guest.is_host && (
                    <button
                      onClick={() => handleRemoveGuest(guest.id, guest.guest_name)}
                      disabled={removingGuest === guest.id}
                      className="p-2 rounded-lg hover:bg-accent-error/10 text-secondary hover:text-accent-error transition-colors disabled:opacity-50"
                      title="Remove guest"
                    >
                      {removingGuest === guest.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border-subtle">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
