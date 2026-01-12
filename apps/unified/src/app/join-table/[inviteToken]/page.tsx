"use client";

/**
 * JOIN TABLE PARTY PAGE
 *
 * Requires authentication and profile completion (same flow as event registration).
 * After authentication, links the attendee to the table party guest and creates event registration.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { LoadingSpinner } from "@crowdstack/ui";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { RegistrationSuccess } from "@/components/RegistrationSuccess";

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
  const [existingProfile, setExistingProfile] = useState<{
    name?: string | null;
    surname?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null>(null);
  const [partyData, setPartyData] = useState<{
    guest_email: string;
    event: {
      id: string;
      name: string;
      slug: string;
      start_time?: string | null;
      end_time?: string | null;
      flier_url?: string | null;
      show_photo_email_notice?: boolean;
      venue?: { name: string; slug?: string; address?: string } | null;
    };
  } | null>(null);

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
          setPartyData({
            guest_email: data.guest.email,
            event: {
              id: data.event.id,
              name: data.event.name,
              slug: data.event.slug,
              start_time: data.event.start_time,
              venue: {
                name: data.venue.name,
                address: data.venue.address,
              },
            },
          });
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

          // Check if user's email matches the invited email
          if (partyData && user.email.toLowerCase() !== partyData.guest_email.toLowerCase()) {
            setError("This invitation was sent to a different email address. Please use the email that received the invitation.");
            setLoading(false);
            return;
          }

          // Check if attendee profile exists
          const { data: attendee } = await supabase
            .from("attendees")
            .select("id, name, surname, date_of_birth, gender, whatsapp, instagram_handle, user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (attendee) {
            // Profile exists - check if already joined
            setExistingProfile({
              name: attendee.name,
              surname: attendee.surname,
              date_of_birth: attendee.date_of_birth,
              gender: attendee.gender as "male" | "female" | null,
              whatsapp: attendee.whatsapp,
              instagram_handle: attendee.instagram_handle,
            });

            // Check if already joined this party
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

  const handleMagicLink = async (email: string) => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    // Verify email matches invitation
    if (partyData && email.toLowerCase() !== partyData.guest_email.toLowerCase()) {
      setError("This invitation was sent to a different email address. Please use the email that received the invitation.");
      return;
    }

    setLoading(true);
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

      setError("");
      alert("Check your email for the magic link! Click it in the same browser to continue.");
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (signupData: SignupData) => {
    setLoading(true);
    setError("");

    try {
      const url = `/api/table-party/join/${inviteToken}`;

      const requestBody: any = {
        ...signupData,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto h-8 w-8" />
          <p className="mt-4 text-secondary">Loading invitation...</p>
        </div>
      </div>
    );
  }

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

  if (success && guestId && partyData) {
    return (
      <RegistrationSuccess
        eventName={partyData.event.name}
        eventSlug={partyData.event.slug}
        venueName={partyData.event.venue?.name || null}
        venueSlug={partyData.event.venue?.slug || null}
        startTime={partyData.event.start_time || null}
        endTime={partyData.event.end_time || null}
        qrToken={qrToken}
        flierUrl={partyData.event.flier_url || null}
        venueAddress={partyData.event.venue?.address || null}
        showPhotoEmailNotice={partyData.event.show_photo_email_notice || false}
        tablePartyGuestId={guestId}
      />
    );
  }

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
          venueName: partyData.event.venue?.name || null,
          startTime: partyData.event.start_time || null,
          registrationCount: 0,
          flierUrl: partyData.event.flier_url || null,
        }}
      />
    );
  }

  // Show login prompt
  if (!authenticated && partyData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Join the Party</h1>
          <p className="text-secondary mb-6">
            You've been invited to join a table at <strong>{partyData.event.name}</strong>.
            Please sign in or create an account to continue.
          </p>

          {magicLinkError && (
            <div className="mb-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error text-sm">
              {magicLinkError === "expired" ? "Magic link expired. Please request a new one." : "Error with magic link. Please try again."}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-accent-error/10 border border-accent-error/30 text-accent-error text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail || ""}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder={partyData.guest_email}
                className="w-full px-4 py-2 bg-raised border border-border-subtle rounded-xl text-primary placeholder-secondary focus:outline-none focus:border-accent-primary"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-secondary">
                Use the email address that received the invitation: <strong>{partyData.guest_email}</strong>
              </p>
            </div>

            <button
              onClick={() => userEmail && handleMagicLink(userEmail)}
              disabled={loading || !userEmail}
              className="w-full px-4 py-3 bg-accent-primary text-white rounded-xl font-medium hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
