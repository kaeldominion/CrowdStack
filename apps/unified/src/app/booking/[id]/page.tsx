"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, InlineSpinner, Card, Badge, Modal, Input } from "@crowdstack/ui";
import {
  Calendar,
  MapPin,
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  Users,
  Wallet,
  QrCode,
  Copy,
  UserPlus,
  Mail,
  X,
  Trash2,
} from "lucide-react";

interface BookingData {
  booking: {
    id: string;
    status: string;
    payment_status: string;
    guest_name: string;
    guest_email: string;
    party_size: number;
    deposit_required: number | null;
    minimum_spend: number | null;
    special_requests: string | null;
    created_at: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    timezone: string | null;
    cover_image: string | null;
  };
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
  };
  table: {
    id: string;
    name: string;
    zone_name: string | null;
  };
  payment: {
    payment_url: string | null;
    expires_at: string | null;
    doku_enabled: boolean;
  } | null;
  party: {
    host: {
      id: string;
      name: string;
      pass_url: string;
      checked_in: boolean;
    } | null;
    guests: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      checked_in: boolean;
    }>;
    invite_url: string | null;
    total_joined: number;
    party_size: number;
  } | null;
  currency: string;
  currencySymbol: string;
}

export default function BookingStatusPage() {
  const params = useParams();
  const bookingId = params.id as string;

  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);
  const [addGuestError, setAddGuestError] = useState<string | null>(null);
  const [guestForm, setGuestForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
  });

  useEffect(() => {
    if (bookingId) {
      fetchBookingStatus();
    }
  }, [bookingId]);

  const fetchBookingStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add cache-busting to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/booking/${bookingId}?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load booking");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyInviteLink = async () => {
    if (data?.party?.invite_url) {
      await navigator.clipboard.writeText(data.party.invite_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddGuest = async () => {
    if (!guestForm.guest_name || !guestForm.guest_email) {
      setAddGuestError("Name and email are required");
      return;
    }

    try {
      setAddingGuest(true);
      setAddGuestError(null);

      const response = await fetch(`/api/booking/${bookingId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guestForm.guest_name,
          guest_email: guestForm.guest_email,
          guest_phone: guestForm.guest_phone || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add guest");
      }

      // Reset form and close modal
      setGuestForm({ guest_name: "", guest_email: "", guest_phone: "" });
      setShowAddGuestModal(false);

      // Refresh booking data to show new guest
      await fetchBookingStatus();
    } catch (err: any) {
      setAddGuestError(err.message);
    } finally {
      setAddingGuest(false);
    }
  };

  const createCheckout = async () => {
    try {
      setCreatingCheckout(true);
      setCheckoutError(null);

      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create payment session");
      }

      // Redirect to payment URL
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (err: any) {
      setCheckoutError(err.message);
      setCreatingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <InlineSpinner className="mx-auto h-8 w-8" />
          <p className="mt-4 text-secondary">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-raised rounded-full flex items-center justify-center mb-4 border border-border-subtle">
            <AlertCircle className="h-8 w-8 text-accent-error" />
          </div>
          <h1 className="text-xl font-bold text-primary mb-2">Booking Not Found</h1>
          <p className="text-secondary mb-6">{error || "This booking could not be found."}</p>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { booking, event, venue, table, payment, party, currencySymbol } = data;
  const eventDate = new Date(event.start_time);

  // Status badge config
  const statusConfig: Record<string, { color: "green" | "amber" | "red" | "blue" | "slate"; label: string }> = {
    pending: { color: "amber", label: "Pending" },
    confirmed: { color: "green", label: "Confirmed" },
    cancelled: { color: "red", label: "Cancelled" },
    completed: { color: "blue", label: "Completed" },
    no_show: { color: "slate", label: "No Show" },
  };

  const paymentStatusConfig: Record<string, { color: "green" | "amber" | "slate" | "blue" | "purple"; label: string; icon: any }> = {
    not_required: { color: "slate", label: "No Deposit Required", icon: Check },
    pending: { color: "amber", label: "Payment Pending", icon: Clock },
    paid: { color: "green", label: "Paid", icon: Check },
    refunded: { color: "blue", label: "Refunded", icon: CreditCard },
    waived: { color: "purple", label: "Waived", icon: Check },
  };

  // If payment is paid, show as confirmed (even if status is still pending)
  // This handles cases where venue marks deposit as received but status hasn't been updated yet
  const effectiveStatus = booking.payment_status === "paid" && booking.status === "pending" 
    ? "confirmed" 
    : booking.status;
  const currentStatus = statusConfig[effectiveStatus] || statusConfig.pending;
  const currentPaymentStatus = paymentStatusConfig[booking.payment_status] || paymentStatusConfig.pending;
  const PaymentIcon = currentPaymentStatus.icon;

  const showPaymentButton =
    booking.payment_status === "pending" &&
    booking.deposit_required &&
    booking.deposit_required > 0 &&
    payment?.doku_enabled;

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <div className="relative">
        {event.cover_image && (
          <div className="absolute inset-0 h-48 overflow-hidden">
            <img
              src={event.cover_image}
              alt={event.name}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/80 to-void" />
          </div>
        )}

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-4">
          <Link
            href={`/e/${event.slug}`}
            className="inline-flex items-center text-sm text-secondary hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            View event
          </Link>

          <h1 className="text-2xl font-bold text-primary mb-2">Your Table Booking</h1>
          <p className="text-secondary">{event.name}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-4">
        {/* Status Card */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-secondary">
              Booking Status
            </h2>
            <Badge color={currentStatus.color} variant="solid" size="sm">
              {currentStatus.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted text-xs uppercase tracking-wide mb-1">Confirmation #</p>
              <p className="text-primary font-mono">{booking.id.split("-")[0].toUpperCase()}</p>
            </div>
            <div>
              <p className="text-muted text-xs uppercase tracking-wide mb-1">Payment</p>
              <div className="flex items-center gap-1.5">
                <PaymentIcon className="h-3.5 w-3.5 text-secondary" />
                <span className="text-primary text-sm">{currentPaymentStatus.label}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Card - Show if deposit pending */}
        {showPaymentButton && (
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-raised border border-border-subtle">
                <Wallet className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-primary">Deposit Required</h2>
                <p className="text-xs text-secondary">Pay now to confirm your booking</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-raised border border-border-subtle">
              <span className="text-secondary text-sm">Amount</span>
              <span className="text-xl font-bold text-primary">
                {currencySymbol}{booking.deposit_required?.toLocaleString()}
              </span>
            </div>

            {checkoutError && (
              <div className="mb-4 p-3 rounded-lg bg-raised border border-accent-error/30 text-accent-error text-sm">
                {checkoutError}
              </div>
            )}

            <Button
              onClick={createCheckout}
              disabled={creatingCheckout}
              className="w-full"
            >
              {creatingCheckout ? (
                <>
                  <InlineSpinner className="h-4 w-4 mr-2" />
                  Creating payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Deposit Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="mt-3 text-xs text-muted text-center">
              You'll be redirected to DOKU's secure payment page
            </p>
          </Card>
        )}

        {/* Confirmed Booking - Party Section */}
        {(booking.status === "confirmed" || booking.payment_status === "paid") && party && (
          <>
            {/* Your Pass */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent-success/10 border border-accent-success/20">
                  <QrCode className="h-5 w-5 text-accent-success" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-primary">Entry Pass</h2>
                  <p className="text-xs text-secondary">Show this QR code at the door</p>
                </div>
              </div>

              {party.host ? (
                <Link href={party.host.pass_url}>
                  <Button className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    View Your Entry Pass
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <div className="text-center p-4 rounded-lg bg-raised border border-border-subtle">
                  <p className="text-sm text-secondary">
                    Your entry pass is being generated... Please refresh the page.
                  </p>
                </div>
              )}
            </Card>

            {/* Invite Friends */}
            {booking.party_size > 1 && (
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
                    <UserPlus className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-primary">Invite Your Party</h2>
                    <p className="text-xs text-secondary">
                      {party.total_joined} of {party.party_size} spots filled
                    </p>
                  </div>
                </div>

                {party.invite_url ? (
                  <div className="mb-4">
                    <p className="text-xs text-muted uppercase tracking-wide mb-2">Share this link</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-raised rounded-lg px-3 py-2.5 text-sm text-secondary truncate border border-border-subtle font-mono">
                        {party.invite_url}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={copyInviteLink}
                        className="shrink-0"
                      >
                        {copiedLink ? (
                          <Check className="h-4 w-4 text-accent-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-raised border border-border-subtle">
                    <p className="text-sm text-secondary text-center">
                      Invite link is being generated... Please refresh the page.
                    </p>
                  </div>
                )}

                {/* Guest List */}
                <div className="border-t border-border-subtle pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted uppercase tracking-wide">Your party</p>
                    {party.total_joined < party.party_size && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowAddGuestModal(true)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Add Guest
                      </Button>
                    )}
                  </div>
                  {party.guests.length > 0 ? (
                    <div className="space-y-2">
                      {party.guests.map((guest) => (
                        <div
                          key={guest.id}
                          className="flex items-center justify-between py-2 px-3 bg-raised rounded-lg border border-border-subtle"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-primary block truncate">{guest.name || guest.email}</span>
                            {guest.email && guest.name && (
                              <span className="text-xs text-secondary truncate block">{guest.email}</span>
                            )}
                          </div>
                          <Badge
                            color={guest.status === "joined" ? "green" : guest.status === "invited" ? "amber" : "slate"}
                            variant="outline"
                            size="sm"
                            className="ml-2"
                          >
                            {guest.status === "joined" ? "Confirmed" : guest.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-secondary">
                      No guests added yet. Invite friends to join your party!
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Booking Details */}
        <Card>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-secondary mb-4">
            Booking Details
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">
                  {eventDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-secondary">
                  {eventDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">{venue.name}</p>
                {venue.address && (
                  <p className="text-xs text-secondary">{venue.address}</p>
                )}
                {venue.city && (
                  <p className="text-xs text-secondary">{venue.city}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted mt-0.5" />
              <div>
                <p className="text-sm text-primary font-medium">
                  {table.name}
                  {table.zone_name && (
                    <span className="text-secondary"> · {table.zone_name}</span>
                  )}
                </p>
                <p className="text-xs text-secondary">
                  {booking.party_size} {booking.party_size === 1 ? "guest" : "guests"}
                </p>
              </div>
            </div>

            {booking.minimum_spend && booking.minimum_spend > 0 && (
              <div className="pt-3 border-t border-border-subtle">
                <p className="text-xs text-secondary">
                  Minimum spend: <span className="text-primary font-medium">{currencySymbol}{booking.minimum_spend.toLocaleString()}</span>
                </p>
              </div>
            )}

            {booking.special_requests && (
              <div className="pt-3 border-t border-border-subtle">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Special Requests</p>
                <p className="text-sm text-secondary">{booking.special_requests}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Guest Info */}
        <Card>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-secondary mb-4">
            Guest Information
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Name</span>
              <span className="text-primary">{booking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Email</span>
              <span className="text-primary">{booking.guest_email}</span>
            </div>
          </div>
        </Card>

        {/* Help Text */}
        <p className="text-center text-xs text-muted pt-4">
          Questions about your booking?{" "}
          <a href={`mailto:support@crowdstack.com`} className="text-accent-secondary hover:underline">
            Contact support
          </a>
        </p>
      </div>

      {/* Add Guest Modal */}
      <Modal
        isOpen={showAddGuestModal}
        onClose={() => {
          setShowAddGuestModal(false);
          setGuestForm({ guest_name: "", guest_email: "", guest_phone: "" });
          setAddGuestError(null);
        }}
        title="Add Guest to Your Party"
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddGuestModal(false);
                setGuestForm({ guest_name: "", guest_email: "", guest_phone: "" });
                setAddGuestError(null);
              }}
              disabled={addingGuest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddGuest}
              loading={addingGuest}
              disabled={!guestForm.guest_name || !guestForm.guest_email}
            >
              Add Guest
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Add a guest to your table booking. After adding, you can share the join link with them. The link works for both new and existing users.
          </p>

          {addGuestError && (
            <div className="p-3 rounded-lg bg-raised border border-accent-error/30 text-accent-error text-sm">
              {addGuestError}
            </div>
          )}

          <Input
            label="Guest Name"
            type="text"
            value={guestForm.guest_name}
            onChange={(e) => setGuestForm({ ...guestForm, guest_name: e.target.value })}
            placeholder="John Doe"
            required
          />

          <Input
            label="Guest Email"
            type="email"
            value={guestForm.guest_email}
            onChange={(e) => setGuestForm({ ...guestForm, guest_email: e.target.value })}
            placeholder="john@example.com"
            required
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            value={guestForm.guest_phone}
            onChange={(e) => setGuestForm({ ...guestForm, guest_phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </Modal>
    </div>
  );
}
