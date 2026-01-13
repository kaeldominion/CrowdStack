"use client";

/**
 * JOIN TABLE PARTY PAGE
 *
 * Shows event details, host info, guest list, and prompts user to sign up/login
 * to join the table party and receive their QR pass.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { LoadingSpinner, Badge } from "@crowdstack/ui";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { RegistrationSuccess } from "@/components/RegistrationSuccess";
import { Calendar, MapPin, Users, Crown, Check, User, PartyPopper } from "lucide-react";

interface PartyData {
  guest: {
    id: string;
    name: string;
    email: string;
    status: string;
    is_host: boolean;
    has_joined: boolean;
  };
  host: {
    name: string;
    initial: string;
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
  guests: Array<{
    id: string;
    name: string;
    initial: string;
    is_host: boolean;
    instagram: string | null;
    joined_at: string | null;
  }>;
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
    time: string;
    start_time: string | null;
    cover_image: string | null;
    flier_url: string | null;
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
  const searchParams = useSearchParams();
  const inviteToken = params.inviteToken as string;
  const magicLinkError = searchParams.get("magic_link_error");

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [success, setSuccess] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string>("");
  const [error, setError] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [existingProfile, setExistingProfile] = useState<{
    name?: string | null;
    surname?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null>(null);
  const [partyData, setPartyData] = useState<PartyData | null>(null);

  // Fetch party data and check auth in parallel on mount
  useEffect(() => {
    const initializePage = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Fetch party data and check auth in parallel
        const [partyResponse, authResult] = await Promise.all([
          fetch(`/api/table-party/join/${inviteToken}`).catch(() => null),
          supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null })),
        ]);

        // Process party data
        if (partyResponse?.ok) {
          const data = await partyResponse.json();
          setPartyData(data);
          // Pre-fill email input with invited email
          setEmailInput(data.guest.email || "");
        } else if (partyResponse) {
          const errorData = await partyResponse.json();
          setError(errorData.error || "Failed to load invitation");
          setLoading(false);
          return;
        }

        const user = authResult.data?.user;

        if (user && user.email) {
          setAuthenticated(true);
          setUserEmail(user.email);

          // Check if attendee profile exists
          const { data: attendee } = await supabase
            .from("attendees")
            .select("id, name, surname, date_of_birth, gender, whatsapp, instagram_handle, user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (attendee) {
            // Profile exists - try to auto-join
            setExistingProfile({
              name: attendee.name,
              surname: attendee.surname,
              date_of_birth: attendee.date_of_birth,
              gender: attendee.gender as "male" | "female" | null,
              whatsapp: attendee.whatsapp,
              instagram_handle: attendee.instagram_handle,
            });

            // Try to join this party
            const joinCheck = await fetch(`/api/table-party/join/${inviteToken}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });

            if (joinCheck.ok) {
              const joinData = await joinCheck.json();
              setSuccess(true);
              setGuestId(joinData.guest_id);
              setQrToken(joinData.qr_token || "");
            } else {
              const joinError = await joinCheck.json();
              // If error is about email mismatch, show it
              if (joinError.error) {
                setError(joinError.error);
              }
            }
          } else {
            // No profile - show signup form
            setShowSignup(true);
          }
        } else {
          // Not authenticated - will show login prompt
          setAuthenticated(false);
        }
      } catch (err: any) {
        console.error("Error initializing page:", err);
        setError(err.message || "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    if (inviteToken) {
      initializePage();
    }
  }, [inviteToken]);

  const handleMagicLink = async () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Verify email matches invitation
    if (partyData && email.toLowerCase() !== partyData.guest.email.toLowerCase()) {
      setError("This invitation was sent to a different email address. Please use the email that received the invitation.");
      return;
    }

    setSendingMagicLink(true);
    setError("");

    try {
      const supabase = createBrowserClient();
      const redirectUrl = new URL(window.location.origin);
      redirectUrl.pathname = `/join-table/${inviteToken}`;

      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (magicError) {
        throw magicError;
      }

      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleSignupSubmit = async (signupData: SignupData) => {
    setLoading(true);
    setError("");

    try {
      const url = `/api/table-party/join/${inviteToken}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join party");
      }

      setSuccess(true);
      setGuestId(result.guest_id);
      setQrToken(result.qr_token || "");
      setShowSignup(false);
    } catch (err: any) {
      console.error("Error joining party:", err);
      setError(err.message || "Failed to join party");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto h-8 w-8" />
          <p className="mt-4 text-secondary">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (no party data)
  if (error && !partyData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-raised rounded-full flex items-center justify-center mb-4 border border-border-subtle">
            <span className="text-accent-error text-2xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-primary mb-2">Invalid Invitation</h1>
          <p className="text-secondary mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-active text-primary rounded-xl border border-border-subtle hover:border-border-strong transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Success state - show QR pass
  if (success && guestId && partyData) {
    return (
      <RegistrationSuccess
        eventName={partyData.event.name}
        eventSlug={partyData.event.slug}
        venueName={partyData.venue.name || null}
        venueSlug={null}
        startTime={partyData.event.start_time || null}
        endTime={null}
        qrToken={qrToken}
        flierUrl={partyData.event.flier_url || partyData.event.cover_image || null}
        venueAddress={partyData.venue.address || null}
        showPhotoEmailNotice={false}
        tablePartyGuestId={guestId}
      />
    );
  }

  // Signup form state
  if (showSignup && partyData) {
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={`/join-table/${inviteToken}`}
        onEmailVerified={async () => false}
        eventSlug={partyData.event.slug}
        existingProfile={existingProfile}
        registrationCount={0}
        eventName={partyData.event.name}
        eventDetails={{
          venueName: partyData.venue.name || null,
          startTime: partyData.event.start_time || null,
          registrationCount: 0,
          flierUrl: partyData.event.flier_url || partyData.event.cover_image || null,
        }}
      />
    );
  }

  // Main invitation view
  if (partyData) {
    const imageUrl = partyData.event.flier_url || partyData.event.cover_image;
    const spotsText = partyData.booking.spots_remaining === 1 
      ? "1 spot left" 
      : `${partyData.booking.spots_remaining} spots left`;

    return (
      <div className="min-h-screen bg-void">
        {/* Hero Section with Event Image */}
        <div className="relative">
          {imageUrl ? (
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <Image
                src={imageUrl}
                alt={partyData.event.name}
                fill
                className="object-cover object-top"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/60 to-transparent" />
            </div>
          ) : (
            <div className="h-32 sm:h-48 bg-gradient-to-b from-accent-primary/20 to-void" />
          )}
          
          {/* Floating Party Badge */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-primary rounded-full shadow-lg">
              <PartyPopper className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-sm">Table Party Invite</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
          {/* Event Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center mb-2">
            {partyData.event.name}
          </h1>

          {/* Event Details */}
          <div className="flex flex-wrap justify-center gap-3 text-sm text-secondary mb-6">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent-primary" />
              <span>{partyData.event.date}</span>
            </div>
            {partyData.venue.name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent-primary" />
                <span>{partyData.venue.name}</span>
              </div>
            )}
          </div>

          {/* Table Info Card */}
          <div className="glass-panel p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="label-mono text-xs mb-1">TABLE</p>
                <p className="text-primary font-semibold text-lg">{partyData.booking.table_name}</p>
                {partyData.booking.zone_name !== "General" && (
                  <p className="text-secondary text-sm">{partyData.booking.zone_name}</p>
                )}
              </div>
              <div className="text-right">
                <Badge 
                  variant={partyData.booking.is_full ? "error" : "secondary"}
                  className="mb-1"
                >
                  {partyData.booking.is_full ? "Full" : spotsText}
                </Badge>
                <p className="text-secondary text-xs">
                  {partyData.booking.joined_count}/{partyData.booking.party_size} joined
                </p>
              </div>
            </div>

            {/* Host Info */}
            <div className="border-t border-border-subtle pt-4 mb-4">
              <p className="label-mono text-xs mb-2">HOSTED BY</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-primary font-medium">{partyData.host.name}</p>
                  <p className="text-secondary text-xs">Table Host</p>
                </div>
              </div>
            </div>

            {/* Guest List */}
            {partyData.guests.length > 0 && (
              <div className="border-t border-border-subtle pt-4">
                <p className="label-mono text-xs mb-3">WHO&apos;S COMING</p>
                <div className="space-y-2">
                  {partyData.guests.map((guest) => (
                    <div key={guest.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        guest.is_host 
                          ? "bg-gradient-to-br from-accent-primary to-accent-secondary text-white" 
                          : "bg-raised text-secondary border border-border-subtle"
                      }`}>
                        {guest.is_host ? <Crown className="w-4 h-4" /> : guest.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-primary text-sm truncate">
                          {guest.name}
                          {guest.is_host && <span className="text-accent-primary ml-1">(Host)</span>}
                        </p>
                        {guest.instagram && (
                          <p className="text-secondary text-xs">@{guest.instagram}</p>
                        )}
                      </div>
                      <Check className="w-4 h-4 text-accent-success flex-shrink-0" />
                    </div>
                  ))}
                  
                  {/* Empty spots */}
                  {Array.from({ length: partyData.booking.spots_remaining }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-3 opacity-40">
                      <div className="w-8 h-8 rounded-full bg-raised border border-dashed border-border-subtle flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                      <p className="text-secondary text-sm">Waiting for guest...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Your Invitation Card */}
          <div className="glass-panel p-4 mb-6 border-accent-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-medium">You&apos;re Invited!</p>
                <p className="text-secondary text-sm">
                  {partyData.guest.name || partyData.guest.email}
                </p>
              </div>
            </div>

            {partyData.booking.is_full && !partyData.guest.has_joined ? (
              <div className="p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-center">
                <p className="text-accent-error text-sm font-medium">This party is full</p>
                <p className="text-secondary text-xs mt-1">Contact the host to request a spot</p>
              </div>
            ) : partyData.event.is_past ? (
              <div className="p-3 rounded-lg bg-accent-warning/10 border border-accent-warning/30 text-center">
                <p className="text-accent-warning text-sm font-medium">This event has passed</p>
              </div>
            ) : (
              <>
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error text-sm">
                    {error}
                  </div>
                )}

                {/* Magic Link Error */}
                {magicLinkError && (
                  <div className="mb-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error text-sm">
                    {magicLinkError === "expired" 
                      ? "Magic link expired. Please request a new one." 
                      : "Error with magic link. Please try again."}
                  </div>
                )}

                {/* Magic Link Sent Success */}
                {magicLinkSent ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-success/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-accent-success" />
                    </div>
                    <p className="text-primary font-medium mb-1">Check your email!</p>
                    <p className="text-secondary text-sm mb-4">
                      We sent a magic link to <strong>{emailInput}</strong>
                    </p>
                    <p className="text-secondary text-xs">
                      Click the link in your email to continue. Make sure to open it in the same browser.
                    </p>
                    <button
                      onClick={() => setMagicLinkSent(false)}
                      className="mt-4 text-accent-primary text-sm hover:underline"
                    >
                      Didn&apos;t receive it? Try again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">
                        Verify your email to join
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-4 py-3 bg-raised border border-border-subtle rounded-xl text-primary placeholder-secondary focus:outline-none focus:border-accent-primary transition-colors"
                        disabled={sendingMagicLink}
                        onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                      />
                      {partyData.guest.email && emailInput.toLowerCase() !== partyData.guest.email.toLowerCase() && (
                        <p className="mt-2 text-xs text-accent-warning">
                          This invitation was sent to: <strong>{partyData.guest.email}</strong>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleMagicLink}
                      disabled={sendingMagicLink || !emailInput}
                      className="w-full px-4 py-3 bg-accent-primary text-white rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sendingMagicLink ? (
                        <>
                          <LoadingSpinner className="w-4 h-4" />
                          Sending...
                        </>
                      ) : (
                        "Continue with Email"
                      )}
                    </button>

                    <p className="text-center text-secondary text-xs">
                      We&apos;ll send you a secure link to verify your email and join the party
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-secondary text-xs">
            Powered by CrowdStack
          </p>
        </div>
      </div>
    );
  }

  return null;
}
