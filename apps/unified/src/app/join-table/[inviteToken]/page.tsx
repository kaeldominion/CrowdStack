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
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { LoadingSpinner, Badge } from "@crowdstack/ui";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { BeautifiedQRCode } from "@/components/BeautifiedQRCode";
import { Calendar, MapPin, Users, Crown, Check, User, PartyPopper, ArrowRight } from "lucide-react";

interface PartyData {
  is_open_invite: boolean; // If true, anyone with the link can join
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
  const [readyToJoin, setReadyToJoin] = useState(false); // User is logged in with profile, ready to join
  const [joiningParty, setJoiningParty] = useState(false); // Loading state for join action
  const [success, setSuccess] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null); // For link to booking page
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
          // Pre-fill email input with invited email (only for specific invites, not open invites)
          if (!data.is_open_invite && data.guest.email) {
            setEmailInput(data.guest.email);
          }
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
            // Profile exists - check if already joined this party
            setExistingProfile({
              name: attendee.name,
              surname: attendee.surname,
              date_of_birth: attendee.date_of_birth,
              gender: attendee.gender as "male" | "female" | null,
              whatsapp: attendee.whatsapp,
              instagram_handle: attendee.instagram_handle,
            });

            // Check if user has already joined this party (check guest status)
            // The partyData.guest will tell us if this specific invite token is joined
            // But for open invites, we need to check if user already has a guest entry
            const partyDataResponse = await fetch(`/api/table-party/join/${inviteToken}`);
            if (partyDataResponse.ok) {
              const freshPartyData = await partyDataResponse.json();
              setPartyData(freshPartyData);
              
              // Check if THIS user already joined (by checking if any guest matches their email)
              const userAlreadyJoined = freshPartyData.guests?.some(
                (g: { name: string }) => g.name === attendee.name
              ) || freshPartyData.guest?.has_joined;
              
              if (userAlreadyJoined && freshPartyData.guest?.has_joined) {
                // Already joined - show success with their QR
                // Need to get their QR token - do a POST which will return already_joined
                const joinCheck = await fetch(`/api/table-party/join/${inviteToken}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                if (joinCheck.ok) {
                  const joinData = await joinCheck.json();
                  if (joinData.already_joined) {
                    setSuccess(true);
                    setGuestId(joinData.guest_id);
                    setBookingId(freshPartyData.booking?.id || null);
                    setQrToken(joinData.qr_token || "");
                  }
                }
              } else {
                // Not joined yet - show table details with Join button
                setReadyToJoin(true);
              }
            } else {
              // Couldn't fetch party data, show join button anyway
              setReadyToJoin(true);
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

    // For specific guest invites (not open invites), verify email matches
    if (partyData && !partyData.is_open_invite && email.toLowerCase() !== partyData.guest.email.toLowerCase()) {
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

  // Handle joining the party when user clicks "Join Table" button
  const handleJoinParty = async () => {
    setJoiningParty(true);
    setError("");

    try {
      const response = await fetch(`/api/table-party/join/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join party");
      }

      setSuccess(true);
      setGuestId(result.guest_id);
      setBookingId(partyData?.booking?.id || null);
      setQrToken(result.qr_token || "");
      setReadyToJoin(false);
    } catch (err: any) {
      console.error("Error joining party:", err);
      setError(err.message || "Failed to join party");
    } finally {
      setJoiningParty(false);
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
      setBookingId(partyData?.booking?.id || null);
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

  // Success state - show table party confirmation with QR and link to manage
  if (success && guestId && partyData) {
    const imageUrl = partyData.event.flier_url || partyData.event.cover_image;
    
    return (
      <div className="min-h-screen bg-void">
        {/* Hero Section */}
        <div className="relative">
          {imageUrl ? (
            <div className="relative h-48 sm:h-64 w-full overflow-hidden">
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
            <div className="h-24 sm:h-32 bg-gradient-to-b from-accent-success/20 to-void" />
          )}
          
          {/* Success Badge */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-success rounded-full shadow-lg">
              <Check className="w-5 h-5 text-white" />
              <span className="text-white font-semibold text-sm">You&apos;re on the list!</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-4 pt-12 pb-8">
          {/* Event Name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center mb-2">
            {partyData.event.name}
          </h1>
          
          <p className="text-secondary text-center mb-6">
            You&apos;ve joined {partyData.host.name}&apos;s table party
          </p>

          {/* Table Details Card */}
          <div className="glass-panel p-4 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
                <Users className="w-6 h-6 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-semibold text-lg">{partyData.booking.table_name}</p>
                {partyData.booking.zone_name !== "General" && (
                  <p className="text-secondary text-sm">{partyData.booking.zone_name}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label-mono text-xs mb-1">EVENT DATE</p>
                <p className="text-primary">{partyData.event.date}</p>
              </div>
              <div>
                <p className="label-mono text-xs mb-1">TIME</p>
                <p className="text-primary">{partyData.event.time}</p>
              </div>
              <div>
                <p className="label-mono text-xs mb-1">VENUE</p>
                <p className="text-primary">{partyData.venue.name}</p>
              </div>
              <div>
                <p className="label-mono text-xs mb-1">PARTY SIZE</p>
                <p className="text-primary">{partyData.booking.joined_count + 1}/{partyData.booking.party_size} guests</p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {qrToken && (
            <div className="glass-panel p-6 mb-6">
              <p className="label-mono text-xs text-center mb-4">YOUR ENTRY PASS</p>
              <div className="flex justify-center mb-4 p-4 bg-white rounded-xl">
                <BeautifiedQRCode url={`${window.location.origin}/e/${partyData.event.slug}/pass?token=${qrToken}`} size={200} />
              </div>
              <p className="text-secondary text-xs text-center">
                Show this QR code at the door for entry
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {bookingId && (
              <Link
                href={`/booking/${bookingId}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors"
              >
                <Users className="w-5 h-5" />
                View Table & Friends
              </Link>
            )}
            
            <Link
              href={`/e/${partyData.event.slug}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-raised text-primary rounded-xl font-medium border border-border-subtle hover:border-border-strong transition-colors"
            >
              View Event Details
            </Link>
          </div>

          {/* Who's Coming */}
          {partyData.guests.length > 0 && (
            <div className="mt-6 glass-panel p-4">
              <p className="label-mono text-xs mb-3">WHO&apos;S COMING</p>
              <div className="flex flex-wrap gap-2">
                {partyData.guests.map((guest) => (
                  <div
                    key={guest.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                      guest.is_host
                        ? "bg-accent-primary/10 border border-accent-primary/30 text-accent-primary"
                        : "bg-raised border border-border-subtle text-primary"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      guest.is_host
                        ? "bg-accent-primary text-white"
                        : "bg-raised text-secondary border border-border-subtle"
                    }`}>
                      {guest.is_host ? <Crown className="w-3 h-3" /> : guest.initial}
                    </div>
                    <span>{guest.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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

                {/* Ready to Join - User is logged in with profile */}
                {readyToJoin ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-success/10 border border-accent-success/30">
                      <Check className="w-5 h-5 text-accent-success flex-shrink-0" />
                      <div>
                        <p className="text-primary text-sm font-medium">You&apos;re signed in as {userEmail}</p>
                        <p className="text-secondary text-xs">Ready to join the party!</p>
                      </div>
                    </div>

                    <button
                      onClick={handleJoinParty}
                      disabled={joiningParty}
                      className="w-full px-4 py-3 bg-accent-primary text-white rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {joiningParty ? (
                        <>
                          <LoadingSpinner className="w-4 h-4" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <PartyPopper className="w-5 h-5" />
                          Join This Table
                        </>
                      )}
                    </button>
                  </div>
                ) : magicLinkSent ? (
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
                      {/* Only show email warning for specific guest invites, not open invites */}
                      {!partyData.is_open_invite && partyData.guest.email && emailInput.toLowerCase() !== partyData.guest.email.toLowerCase() && (
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
