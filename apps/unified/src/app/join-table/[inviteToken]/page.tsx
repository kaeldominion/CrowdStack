"use client";

/**
 * JOIN TABLE PARTY PAGE
 *
 * Public page for guests to accept a table party invitation.
 * Creates basic account and generates QR pass.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, X, Calendar, MapPin, Users, Loader2, PartyPopper } from "lucide-react";
import Link from "next/link";
import { Logo, Button, Card, Input } from "@crowdstack/ui";

interface PartyData {
  guest: {
    id: string;
    name: string;
    email: string;
    status: string;
    is_host: boolean;
    has_joined: boolean;
    checked_in: boolean;
  };
  booking: {
    id: string;
    host_name: string;
    party_size: number;
    joined_count: number;
    spots_remaining: number;
    is_full: boolean;
    table_name: string;
    zone_name: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
    time: string;
    start_time: string;
    cover_image: string | null;
    is_past: boolean;
  };
  venue: {
    name: string;
    address: string;
    city: string;
  };
}

export default function JoinTablePage() {
  const params = useParams();
  const router = useRouter();
  const inviteToken = params.inviteToken as string;

  const [partyData, setPartyData] = useState<PartyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Form state for optional name/phone update
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadPartyData();
  }, [inviteToken]);

  const loadPartyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/table-party/join/${inviteToken}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load invitation");
      }

      setPartyData(data);
      setName(data.guest.name || "");

      // If already joined, set joined state
      if (data.guest.has_joined) {
        setJoined(true);
        setGuestId(data.guest.id);
      }
    } catch (err: any) {
      console.error("Error loading party:", err);
      setError(err.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      setError(null);

      const response = await fetch(`/api/table-party/join/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          phone: phone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join party");
      }

      setJoined(true);
      setGuestId(data.guest_id);
    } catch (err: any) {
      console.error("Error joining party:", err);
      setError(err.message || "Failed to join party");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-secondary">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !partyData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <Card className="max-w-sm w-full !p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-accent-error/20 flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-accent-error" />
          </div>
          <h2 className="font-sans text-xl font-bold text-primary mb-2">
            Invalid Invitation
          </h2>
          <p className="text-sm text-secondary mb-6">
            {error || "This invitation link is invalid or has expired."}
          </p>
          <Button href="/" variant="secondary" className="w-full">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Show success state after joining
  if (joined && guestId) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-12">
        {/* Logo Badge */}
        <div className="mb-6">
          <div className="w-20 h-20 rounded-2xl bg-accent-success/20 border-2 border-accent-success/50 flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-accent-success" />
          </div>
        </div>

        <h1 className="font-sans text-2xl font-bold text-primary mb-2">
          You're In!
        </h1>
        <p className="text-secondary text-center mb-8 max-w-sm">
          You've joined {partyData.booking.host_name}'s table at{" "}
          <span className="text-primary font-medium">{partyData.event.name}</span>.
          Check your email for your QR pass.
        </p>

        <Card className="max-w-sm w-full !p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted" />
              <div>
                <p className="text-primary font-medium">{partyData.event.date}</p>
                <p className="text-sm text-secondary">{partyData.event.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted" />
              <div>
                <p className="text-primary font-medium">{partyData.venue.name}</p>
                {partyData.venue.address && (
                  <p className="text-sm text-secondary">{partyData.venue.address}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted" />
              <div>
                <p className="text-primary font-medium">
                  {partyData.booking.table_name}
                </p>
                <p className="text-sm text-secondary">
                  {partyData.booking.zone_name} • Hosted by {partyData.booking.host_name}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Button
          onClick={() => router.push(`/table-pass/${guestId}`)}
          className="mt-6 w-full max-w-sm"
        >
          View Your Pass
        </Button>

        <Link
          href={`/e/${partyData.event.slug}`}
          className="mt-4 text-sm text-accent-primary hover:underline"
        >
          View event details
        </Link>
      </div>
    );
  }

  // Show past event warning
  if (partyData.event.is_past) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <Card className="max-w-sm w-full !p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-accent-warning/20 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-accent-warning" />
          </div>
          <h2 className="font-sans text-xl font-bold text-primary mb-2">
            Event Has Passed
          </h2>
          <p className="text-sm text-secondary mb-6">
            This event took place on {partyData.event.date}.
            This invitation is no longer valid.
          </p>
          <Button href="/" variant="secondary" className="w-full">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Show party full warning
  if (partyData.booking.is_full) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <Card className="max-w-sm w-full !p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-accent-warning/20 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-accent-warning" />
          </div>
          <h2 className="font-sans text-xl font-bold text-primary mb-2">
            Party is Full
          </h2>
          <p className="text-sm text-secondary mb-4">
            {partyData.booking.host_name}'s table at {partyData.event.name} has reached its capacity of {partyData.booking.party_size} guests.
          </p>
          <p className="text-sm text-secondary mb-6">
            Contact {partyData.booking.host_name} to request additional spots.
          </p>
          <Button href={`/e/${partyData.event.slug}`} variant="secondary" className="w-full">
            View Event
          </Button>
        </Card>
      </div>
    );
  }

  // Show invitation screen
  return (
    <div className="min-h-screen bg-void">
      {/* Event Cover */}
      {partyData.event.cover_image && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={partyData.event.cover_image}
            alt={partyData.event.name}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-void/80 to-void" />
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-8 -mt-20 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo variant="tricolor" size="lg" iconOnly />
        </div>

        {/* Invitation Card */}
        <Card className="!p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-sm text-accent-secondary font-medium mb-1">
              You're invited to
            </p>
            <h1 className="font-sans text-2xl font-bold text-primary">
              {partyData.booking.host_name}'s Table
            </h1>
            <p className="text-muted mt-1">
              at {partyData.event.name}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-medium">{partyData.event.date}</p>
                <p className="text-sm text-secondary">{partyData.event.time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-medium">{partyData.venue.name}</p>
                {partyData.venue.address && (
                  <p className="text-sm text-secondary">{partyData.venue.address}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-medium">
                  {partyData.booking.table_name}
                </p>
                <p className="text-sm text-secondary">
                  {partyData.booking.zone_name} • {partyData.booking.spots_remaining} spot{partyData.booking.spots_remaining !== 1 ? 's' : ''} left
                </p>
              </div>
            </div>
          </div>

          {/* Optional form fields */}
          <div className="border-t border-border-subtle pt-6 space-y-4">
            <p className="text-sm text-secondary mb-4">
              Confirm your details to join the party:
            </p>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Your Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">
                Phone (optional)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
              />
            </div>

            <p className="text-xs text-muted">
              Invited as: {partyData.guest.email}
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full mt-6"
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>
        </Card>

        <p className="text-center text-xs text-muted">
          By joining, you agree to receive event updates via email.
        </p>
      </div>
    </div>
  );
}
