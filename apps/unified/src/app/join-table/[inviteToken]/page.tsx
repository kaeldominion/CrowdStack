"use client";

/**
 * JOIN TABLE PARTY PAGE
 *
 * Shows event details, host info, guest list, and prompts user to sign up/login
 * to join the table party and receive their QR pass.
 *
 * Flow:
 * 1. Unauthenticated -> Show party details, "Join Table" redirects to login
 * 2. Authenticated, complete profile -> One-click join
 * 3. Authenticated, incomplete profile -> TableJoinForm (simple single-page form)
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { LoadingSpinner, Badge } from "@crowdstack/ui";
import { TableJoinForm, type TableJoinFormData } from "@/components/TableJoinForm";
import { Users, Crown, Check, User, PartyPopper, Ticket, ArrowLeft, MapPin, Instagram } from "lucide-react";
import { MobileScrollExperience } from "@/components/MobileScrollExperience";

interface PartyData {
  is_open_invite: boolean;
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
    slug: string;
    address: string;
    city: string;
  };
}

export default function JoinTablePage() {
  const params = useParams();
  const router = useRouter();
  const inviteToken = params.inviteToken as string;

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [readyToJoin, setReadyToJoin] = useState(false);
  const [joiningParty, setJoiningParty] = useState(false);
  const [success, setSuccess] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");
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
        } else if (partyResponse) {
          const errorData = await partyResponse.json();
          setError(errorData.error || "Failed to load invitation");
          setLoading(false);
          return;
        }

        const user = authResult.data?.user;

        if (user && user.email) {
          setUserEmail(user.email);

          // Check if attendee profile exists
          const { data: attendee } = await supabase
            .from("attendees")
            .select("id, name, surname, date_of_birth, gender, whatsapp, instagram_handle, user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (attendee) {
            // Profile exists - save existing profile data
            const profileData = {
              name: attendee.name,
              surname: attendee.surname,
              date_of_birth: attendee.date_of_birth,
              gender: attendee.gender as "male" | "female" | null,
              whatsapp: attendee.whatsapp,
              instagram_handle: attendee.instagram_handle,
            };
            setExistingProfile(profileData);

            // Check if profile is COMPLETE (has required fields)
            const isProfileComplete = !!(
              attendee.name &&
              attendee.surname &&
              attendee.date_of_birth &&
              attendee.gender
            );

            // Check if user has already joined this party
            const partyDataResponse = await fetch(`/api/table-party/join/${inviteToken}`);
            if (partyDataResponse.ok) {
              const freshPartyData = await partyDataResponse.json();
              setPartyData(freshPartyData);

              // Check if THIS user already joined
              const userAlreadyJoined = freshPartyData.guests?.some(
                (g: { name: string }) => g.name === attendee.name
              ) || freshPartyData.guest?.has_joined;

              if (userAlreadyJoined && freshPartyData.guest?.has_joined) {
                // Already joined - show success with their QR
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
                  }
                }
              } else if (isProfileComplete) {
                // Profile is complete, not joined yet - show one-click join
                setReadyToJoin(true);
              } else {
                // Profile incomplete - show TableJoinForm
                setShowProfileForm(true);
              }
            } else {
              if (isProfileComplete) {
                setReadyToJoin(true);
              } else {
                setShowProfileForm(true);
              }
            }
          } else {
            // No profile at all - show TableJoinForm
            setShowProfileForm(true);
          }
        }
        // Not authenticated - will show invitation UI with login redirect
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

  // Handle joining the party when user clicks "Join Table" button (one-click join)
  const handleJoinParty = async () => {
    setJoiningParty(true);
    setError("");

    try {
      // Send existing profile data so the API uses the correct name
      const response = await fetch(`/api/table-party/join/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: existingProfile?.name || "",
          surname: existingProfile?.surname || "",
          date_of_birth: existingProfile?.date_of_birth || "",
          gender: existingProfile?.gender || "",
          instagram_handle: existingProfile?.instagram_handle || "",
          whatsapp: existingProfile?.whatsapp || "",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join party");
      }

      setSuccess(true);
      setGuestId(result.guest_id);
      setBookingId(partyData?.booking?.id || null);
      setReadyToJoin(false);
    } catch (err: any) {
      console.error("Error joining party:", err);
      setError(err.message || "Failed to join party");
    } finally {
      setJoiningParty(false);
    }
  };

  // Handle form submission from TableJoinForm
  const handleFormSubmit = async (formData: TableJoinFormData) => {
    setJoiningParty(true);
    setError("");

    try {
      const response = await fetch(`/api/table-party/join/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to join party");
      }

      setSuccess(true);
      setGuestId(result.guest_id);
      setBookingId(partyData?.booking?.id || null);
      setShowProfileForm(false);
    } catch (err: any) {
      console.error("Error joining party:", err);
      setError(err.message || "Failed to join party");
    } finally {
      setJoiningParty(false);
    }
  };

  // Handle unauthenticated user clicking "Join Table" - redirect to login
  const handleLoginRedirect = () => {
    const returnUrl = encodeURIComponent(`/join-table/${inviteToken}`);
    router.push(`/login?redirect=${returnUrl}`);
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

          {/* Actions */}
          <div className="space-y-3">
            {guestId && (
              <Link
                href={`/table-pass/${guestId}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 transition-all"
              >
                <Ticket className="w-5 h-5" />
                View Your Entry Pass
              </Link>
            )}

            {bookingId && (
              <Link
                href={`/booking/${bookingId}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-raised text-primary rounded-xl font-medium border border-border-subtle hover:border-border-strong transition-colors"
              >
                <Users className="w-5 h-5" />
                View Table & Friends
              </Link>
            )}

            <Link
              href={`/e/${partyData.event.slug}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-glass text-secondary rounded-xl font-medium hover:text-primary transition-colors"
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

  // Profile form state (for authenticated users with incomplete profile)
  if (showProfileForm && partyData) {
    const imageUrl = partyData.event.flier_url || partyData.event.cover_image;

    return (
      <div className="min-h-screen bg-void">
        {/* Header with back button and event info */}
        <div className="sticky top-0 z-10 bg-void/95 backdrop-blur-sm border-b border-border-subtle">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setShowProfileForm(false)}
              className="p-2 -ml-2 rounded-lg hover:bg-active transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-secondary" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-primary font-medium truncate">{partyData.event.name}</p>
              <p className="text-secondary text-xs">{partyData.host.name}&apos;s Table</p>
            </div>
            {imageUrl && (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-border-subtle flex-shrink-0">
                <Image
                  src={imageUrl}
                  alt={partyData.event.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Form content */}
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-primary mb-2">Complete Your Profile</h1>
            <p className="text-secondary text-sm">
              Fill in your details to join {partyData.host.name}&apos;s table party
            </p>
          </div>

          <TableJoinForm
            existingProfile={existingProfile}
            onSubmit={handleFormSubmit}
            isLoading={joiningParty}
            error={error || null}
            userEmail={userEmail || undefined}
          />
        </div>
      </div>
    );
  }

  // Main invitation view
  if (partyData) {
    const imageUrl = partyData.event.flier_url || partyData.event.cover_image;
    const spotsText = partyData.booking.spots_remaining === 1
      ? "1 spot left"
      : `${partyData.booking.spots_remaining} spots left`;

    const eventStartDate = partyData.event.start_time ? new Date(partyData.event.start_time) : undefined;

    // Content that goes inside the scrolling area
    const inviteContent = (
      <div className="bg-[var(--bg-void)]/95 rounded-t-3xl">
        {/* Drag indicator */}
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-12 h-1 bg-[var(--border-strong)] rounded-full" />
        </div>

        <div className="px-5 pb-12 space-y-5">
          {/* Party Badge */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-primary rounded-full">
              <PartyPopper className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Table Party Invite</span>
            </div>
          </div>

          {/* Table Info Card */}
          <div className="glass-panel p-4">
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
                          <p className="text-secondary text-xs flex items-center gap-1">
                            <Instagram className="w-3 h-3" />
                            @{guest.instagram}
                          </p>
                        )}
                      </div>
                      <Check className="w-4 h-4 text-accent-success flex-shrink-0" />
                    </div>
                  ))}

                  {/* Empty spots */}
                  {Array.from({ length: Math.min(partyData.booking.spots_remaining, 3) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-3 opacity-40">
                      <div className="w-8 h-8 rounded-full bg-raised border border-dashed border-border-subtle flex items-center justify-center">
                        <User className="w-4 h-4 text-secondary" />
                      </div>
                      <p className="text-secondary text-sm">Waiting for guest...</p>
                    </div>
                  ))}
                  {partyData.booking.spots_remaining > 3 && (
                    <p className="text-secondary text-xs pl-11">
                      +{partyData.booking.spots_remaining - 3} more spots available
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Venue Link */}
          {partyData.venue.slug && partyData.venue.name && (
            <Link
              href={`/v/${partyData.venue.slug}`}
              className="flex items-center gap-3 p-4 rounded-xl bg-raised/50 border border-border-subtle hover:border-accent-primary/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent-secondary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-accent-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-primary font-medium truncate">{partyData.venue.name}</p>
                {partyData.venue.city && (
                  <p className="text-secondary text-sm">{partyData.venue.city}</p>
                )}
              </div>
              <ArrowLeft className="w-4 h-4 text-secondary rotate-180" />
            </Link>
          )}

          {/* Your Invitation Card */}
          <div className="glass-panel p-4 border-accent-primary/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-primary font-medium">You&apos;re Invited!</p>
                <p className="text-secondary text-sm">
                  {userEmail || partyData.guest.name || partyData.guest.email || "Join the party"}
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

                {/* Ready to Join - User is logged in with complete profile */}
                {readyToJoin ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-success/10 border border-accent-success/30">
                      <Check className="w-5 h-5 text-accent-success flex-shrink-0" />
                      <div>
                        <p className="text-primary text-sm font-medium">Signed in as {userEmail}</p>
                        <p className="text-secondary text-xs">Tap below to join!</p>
                      </div>
                    </div>

                    <button
                      onClick={handleJoinParty}
                      disabled={joiningParty}
                      className="w-full px-4 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {joiningParty ? (
                        <>
                          <LoadingSpinner className="w-5 h-5" />
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
                ) : userEmail ? (
                  // Authenticated but incomplete profile - show button to go to form
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/30">
                      <User className="w-5 h-5 text-accent-secondary flex-shrink-0" />
                      <div>
                        <p className="text-primary text-sm font-medium">Almost there!</p>
                        <p className="text-secondary text-xs">Complete your profile to join</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowProfileForm(true)}
                      className="w-full px-4 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <PartyPopper className="w-5 h-5" />
                      Complete Profile & Join
                    </button>
                  </div>
                ) : (
                  // Not authenticated - show login button
                  <div className="space-y-4">
                    <button
                      onClick={handleLoginRedirect}
                      className="w-full px-4 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <PartyPopper className="w-5 h-5" />
                      Join This Table
                    </button>

                    <p className="text-center text-secondary text-xs">
                      Quick signup to get your QR pass
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

    // Render with MobileScrollExperience for mobile, and a desktop layout
    if (imageUrl) {
      return (
        <>
          {/* Mobile: Immersive scroll experience */}
          <MobileScrollExperience
            flierUrl={imageUrl}
            eventName={partyData.event.name}
            venueName={partyData.venue.name}
            venueCity={partyData.venue.city}
            startDate={eventStartDate}
          >
            {inviteContent}
          </MobileScrollExperience>

          {/* Desktop: Event page style layout */}
          <>
            {/* Blurred Background - Fixed, fills entire viewport */}
            <div
              className="hidden lg:block fixed inset-0 z-0 overflow-hidden pointer-events-none bg-void"
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: 'blur(80px)',
                  transform: 'scale(1.3)',
                  opacity: 0.15,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/70 to-void" />
            </div>

            {/* Main Content */}
            <div className="hidden lg:block min-h-screen relative z-10 pt-20">
              <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                  {/* Left Column - Flier */}
                  <div className="lg:col-span-4">
                    <div className="sticky top-24">
                      {/* Flier */}
                      <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl overflow-hidden border border-border-subtle shadow-soft">
                        <Image
                          src={imageUrl}
                          alt={`${partyData.event.name} flier`}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 1024px) 100vw, 384px"
                        />
                      </div>

                      {/* Party Stats Card */}
                      <div className="mt-6 glass-panel p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                            Party Status
                          </p>
                          <Badge
                            variant={partyData.booking.is_full ? "error" : "success"}
                          >
                            {partyData.booking.is_full ? "Full" : spotsText}
                          </Badge>
                        </div>

                        {/* Guest avatars */}
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {partyData.guests.slice(0, 5).map((guest) => (
                              <div
                                key={guest.id}
                                className={`w-8 h-8 rounded-full border-2 border-void flex items-center justify-center text-xs font-bold ${
                                  guest.is_host
                                    ? "bg-gradient-to-br from-accent-primary to-accent-secondary text-white"
                                    : "bg-raised text-secondary"
                                }`}
                              >
                                {guest.is_host ? <Crown className="w-4 h-4" /> : guest.initial}
                              </div>
                            ))}
                            {partyData.booking.party_size > 5 && (
                              <div className="w-8 h-8 rounded-full bg-raised border-2 border-void flex items-center justify-center">
                                <span className="text-[10px] font-bold text-primary">
                                  +{partyData.booking.party_size - 5}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">
                              {partyData.booking.joined_count}
                            </p>
                            <p className="font-mono text-[9px] uppercase tracking-wider text-muted">
                              of {partyData.booking.party_size}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-raised rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min((partyData.booking.joined_count / partyData.booking.party_size) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Column - Invite Info */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Header Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {eventStartDate && (
                        <Badge color="purple" variant="solid" className="font-mono uppercase">
                          {eventStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
                        </Badge>
                      )}
                      <Badge color="blue" variant="solid" className="font-mono uppercase flex items-center gap-1">
                        <PartyPopper className="h-3 w-3" />
                        Table Party
                      </Badge>
                    </div>

                    {/* Event Title */}
                    <h1 className="font-sans text-4xl xl:text-5xl font-black text-primary uppercase tracking-tight leading-[0.95]">
                      {partyData.event.name}
                    </h1>

                    {/* Venue Link */}
                    {partyData.venue.name && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20">
                          <MapPin className="w-5 h-5 text-accent-secondary" />
                        </div>
                        {partyData.venue.slug ? (
                          <Link
                            href={`/v/${partyData.venue.slug}`}
                            className="text-primary hover:text-accent-primary transition-colors"
                          >
                            <p className="font-semibold">{partyData.venue.name}</p>
                            {partyData.venue.city && (
                              <p className="text-sm text-secondary">{partyData.venue.city}</p>
                            )}
                          </Link>
                        ) : (
                          <div>
                            <p className="font-semibold text-primary">{partyData.venue.name}</p>
                            {partyData.venue.city && (
                              <p className="text-sm text-secondary">{partyData.venue.city}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-border-subtle" />

                    {/* Table Info Card */}
                    <div className="glass-panel p-5">
                      <p className="label-mono text-xs mb-4">TABLE DETAILS</p>
                      <div className="flex items-center gap-4">
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
                    </div>

                    {/* Host Info */}
                    <div className="glass-panel p-5">
                      <p className="label-mono text-xs mb-4">HOSTED BY</p>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                          <Crown className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="text-primary font-semibold text-lg">{partyData.host.name}</p>
                          <p className="text-muted text-sm">Table Host</p>
                        </div>
                      </div>
                    </div>

                    {/* Guest List */}
                    {partyData.guests.length > 0 && (
                      <div className="glass-panel p-5">
                        <p className="label-mono text-xs mb-4">WHO&apos;S COMING</p>
                        <div className="space-y-3">
                          {partyData.guests.map((guest) => (
                            <div key={guest.id} className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                guest.is_host
                                  ? "bg-gradient-to-br from-accent-primary to-accent-secondary text-white"
                                  : "bg-raised text-secondary border border-border-subtle"
                              }`}>
                                {guest.is_host ? <Crown className="w-5 h-5" /> : guest.initial}
                              </div>
                              <div className="flex-1">
                                <p className="text-primary font-medium">{guest.name}</p>
                                {guest.instagram && (
                                  <p className="text-secondary text-xs flex items-center gap-1">
                                    <Instagram className="w-3 h-3" />
                                    @{guest.instagram}
                                  </p>
                                )}
                              </div>
                              <Check className="w-5 h-5 text-accent-success" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Actions */}
                  <div className="lg:col-span-3">
                    <div className="sticky top-24 space-y-4">
                      {/* Invitation Card */}
                      <div className="glass-panel p-5 border-accent-primary/30">
                        <div className="text-center mb-5">
                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/20 mb-3">
                            <Ticket className="w-7 h-7 text-accent-primary" />
                          </div>
                          <h3 className="text-lg font-semibold text-primary">You&apos;re Invited!</h3>
                          <p className="text-sm text-secondary mt-1">
                            Join {partyData.host.name}&apos;s table
                          </p>
                        </div>

                        {/* Action Section */}
                        {partyData.booking.is_full && !partyData.guest.has_joined ? (
                          <div className="p-4 rounded-xl bg-accent-error/10 border border-accent-error/20 text-center">
                            <p className="text-accent-error font-medium">This party is full</p>
                            <p className="text-secondary text-sm mt-1">Contact the host to request a spot</p>
                          </div>
                        ) : partyData.event.is_past ? (
                          <div className="p-4 rounded-xl bg-accent-warning/10 border border-accent-warning/20 text-center">
                            <p className="text-accent-warning font-medium">This event has passed</p>
                          </div>
                        ) : readyToJoin ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-success/10 border border-accent-success/20">
                              <Check className="w-5 h-5 text-accent-success flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-primary text-sm font-medium truncate">{userEmail}</p>
                                <p className="text-muted text-xs">Ready to join!</p>
                              </div>
                            </div>
                            <button
                              onClick={handleJoinParty}
                              disabled={joiningParty}
                              className="w-full px-6 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {joiningParty ? (
                                <>
                                  <LoadingSpinner className="w-5 h-5" />
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
                        ) : userEmail ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20">
                              <User className="w-5 h-5 text-accent-secondary flex-shrink-0" />
                              <div>
                                <p className="text-primary text-sm font-medium">Almost there!</p>
                                <p className="text-muted text-xs">Complete your profile to join</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowProfileForm(true)}
                              className="w-full px-6 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                              <PartyPopper className="w-5 h-5" />
                              Complete Profile & Join
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <button
                              onClick={handleLoginRedirect}
                              className="w-full px-6 py-4 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                              <PartyPopper className="w-5 h-5" />
                              Join This Table
                            </button>
                            <p className="text-center text-muted text-sm">
                              Quick signup to get your QR pass
                            </p>
                          </div>
                        )}
                      </div>

                      {/* View Event Link */}
                      <Link
                        href={`/e/${partyData.event.slug}`}
                        className="block w-full p-4 rounded-xl border border-border-subtle bg-raised/50 hover:bg-raised transition-colors text-center"
                      >
                        <p className="text-primary font-medium">View Event Details</p>
                        <p className="text-muted text-xs mt-1">See full event info</p>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        </>
      );
    }

    // Fallback without flier image
    return (
      <div className="min-h-screen bg-void">
        <div className="h-32 bg-gradient-to-b from-accent-primary/20 to-void" />
        <div className="max-w-lg mx-auto px-4 -mt-8">
          {inviteContent}
        </div>
      </div>
    );
  }

  return null;
}
