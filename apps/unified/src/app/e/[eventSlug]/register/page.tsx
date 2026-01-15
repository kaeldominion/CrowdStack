"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { LoadingSpinner } from "@crowdstack/ui";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { RegistrationSuccess } from "@/components/RegistrationSuccess";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRef = searchParams.get("ref"); // referral code from URL
  // Also check sessionStorage for ref (set by ReferralTracker when clicking shared link)
  const sessionRef = typeof window !== "undefined" ? sessionStorage.getItem("referral_ref") : null;
  const ref = urlRef || sessionRef; // Prefer URL ref, fallback to sessionStorage
  
  // Debug logging for referral tracking
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[Register] Referral tracking:", { urlRef, sessionRef, ref });
  }
  const magicLinkError = searchParams.get("magic_link_error"); // Error from magic link callback
  const eventSlug = params.eventSlug as string;

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [error, setError] = useState("");
  const [existingProfile, setExistingProfile] = useState<{
    name?: string | null;
    surname?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null>(null);
  const [registrationCount, setRegistrationCount] = useState<number>(0);
  const [eventDetails, setEventDetails] = useState<{
    name: string;
    venue?: { name: string; slug?: string; address?: string } | null;
    start_time?: string | null;
    end_time?: string | null;
    registration_count?: number;
    flier_url?: string | null;
    show_photo_email_notice?: boolean;
    checkin_cutoff_enabled?: boolean;
    checkin_cutoff_time_male?: string | null;
    checkin_cutoff_time_female?: string | null;
    attendee_gender?: string | null;
  } | null>(null);
  const [eventDataForSignup, setEventDataForSignup] = useState<{
    name: string;
    venueName?: string | null;
    startTime?: string | null;
    registrationCount?: number;
    flierUrl?: string | null;
  } | null>(null);

  // Fetch event data and check auth in parallel on mount
  useEffect(() => {
    const initializePage = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Fetch event data and check auth in parallel
        const [eventResponse, authResult] = await Promise.all([
          fetch(`/api/events/by-slug/${eventSlug}`).catch(() => null),
          supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null })),
        ]);

        // Process event data
        if (eventResponse?.ok) {
          const eventData = await eventResponse.json();
          if (eventData.event) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Register] fetchEventData got flier_url:", eventData.event.flier_url);
            }
            setEventDataForSignup({
              name: eventData.event.name,
              venueName: eventData.event.venue?.name || null,
              startTime: eventData.event.start_time || null,
              registrationCount: eventData.event.registration_count || 0,
              flierUrl: eventData.event.flier_url || null,
            });
            if (!eventDetails) {
              setEventDetails({
                name: eventData.event.name,
                venue: eventData.event.venue,
                start_time: eventData.event.start_time,
                end_time: eventData.event.end_time || null,
                registration_count: eventData.event.registration_count || 0,
                flier_url: eventData.event.flier_url || null,
                show_photo_email_notice: eventData.event.show_photo_email_notice || false,
                checkin_cutoff_enabled: eventData.event.checkin_cutoff_enabled || false,
                checkin_cutoff_time_male: eventData.event.checkin_cutoff_time_male || null,
                checkin_cutoff_time_female: eventData.event.checkin_cutoff_time_female || null,
              });
            }
          }
        }

        const user = authResult.data?.user;

        if (user && user.email) {
          setAuthenticated(true);
          setUserEmail(user.email);
          
          // Check registration and profile in parallel
          const [checkResponse, profileResponse] = await Promise.all([
            fetch(`/api/events/by-slug/${eventSlug}/check-registration`).catch(() => null),
            fetch("/api/profile").catch(() => null),
          ]);

          // Check if already registered
          if (checkResponse?.ok) {
            const checkData = await checkResponse.json();
            if (checkData.registered && checkData.event) {
              setSuccess(true);
              setQrToken(checkData.qr_pass_token);
              setEventDetails({
                name: checkData.event.name,
                venue: checkData.event.venue,
                start_time: checkData.event.start_time,
                end_time: checkData.event.end_time || null,
                flier_url: checkData.event.flier_url,
                show_photo_email_notice: checkData.event.show_photo_email_notice || false,
                checkin_cutoff_enabled: checkData.event.checkin_cutoff_enabled || false,
                checkin_cutoff_time_male: checkData.event.checkin_cutoff_time_male || null,
                checkin_cutoff_time_female: checkData.event.checkin_cutoff_time_female || null,
                attendee_gender: checkData.attendee?.gender || null,
              });
              setLoading(false);
              return;
            }
          }

          // Process profile data
          if (profileResponse?.ok) {
            const profileData = await profileResponse.json();
            const attendee = profileData.attendee;
            
            if (attendee) {
              setExistingProfile({
                name: attendee.name,
                surname: attendee.surname,
                date_of_birth: attendee.date_of_birth,
                gender: attendee.gender || null,
                whatsapp: attendee.whatsapp,
                instagram_handle: attendee.instagram_handle,
              });
            }
            
            if (profileData.registrationCount !== undefined) {
              setRegistrationCount(profileData.registrationCount);
            }
          }
          
          setShowSignup(true);
          setLoading(false);
        } else {
          setAuthenticated(false);
          setLoading(false);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Register] Error initializing page:", err);
        }
        setLoading(false);
      }
    };

    if (eventSlug) {
      initializePage();
    }
  }, [eventSlug]);

  const handleMagicLink = async () => {
    if (!userEmail) {
      setError("Please enter an email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserClient();
      // Build redirect URL with ref parameter
      const redirectUrl = new URL(window.location.origin);
      redirectUrl.pathname = `/e/${eventSlug}/register`;
      if (ref) {
        redirectUrl.searchParams.set("ref", ref);
      }

      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: {
          emailRedirectTo: `${redirectUrl.toString()}`,
        },
      });

      if (magicError) {
        throw magicError;
      }

      // Show success message
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
      if (process.env.NODE_ENV === "development") {
        console.log("handleSignupSubmit called with:", signupData);
      }
      
      const url = new URL(`/api/events/by-slug/${eventSlug}/register`, window.location.origin);
      if (ref) {
        url.searchParams.set("ref", ref);
      }

      // Map whatsapp to phone if needed (API expects phone)
      const requestBody: any = {
        ...signupData,
        email: signupData.email || userEmail, // Use email from form (or fallback to userEmail if authenticated)
      };
      
      // If whatsapp is provided but not phone, use whatsapp as phone
      if (signupData.whatsapp && !requestBody.phone) {
        requestBody.phone = signupData.whatsapp;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("Sending registration request:", requestBody);
      }
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("[Register] Registration response:", JSON.stringify(data, null, 2));
      }

      if (!response.ok) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Register] Registration failed:", data.error, data.details);
        }
        throw new Error(data.error || data.details || "Registration failed");
      }

      // Always set event details, even if data.event is missing (will fetch if needed)
      if (data.event) {
        setEventDetails({
          name: data.event.name,
          venue: data.event.venue,
          start_time: data.event.start_time,
          end_time: data.event.end_time || null,
          flier_url: data.event.flier_url,
          show_photo_email_notice: data.event.show_photo_email_notice || false,
          checkin_cutoff_enabled: data.event.checkin_cutoff_enabled || false,
          checkin_cutoff_time_male: data.event.checkin_cutoff_time_male || null,
          checkin_cutoff_time_female: data.event.checkin_cutoff_time_female || null,
        });
      } else {
        // If event details not in response, fetch them
        try {
          const eventResponse = await fetch(`/api/events/by-slug/${eventSlug}`);
          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            setEventDetails({
              name: eventData.event?.name || eventData.name,
              venue: eventData.event?.venue || eventData.venue || null,
              start_time: eventData.event?.start_time || eventData.start_time || null,
              end_time: eventData.event?.end_time || eventData.end_time || null,
              flier_url: eventData.event?.flier_url || eventData.flier_url || null,
              show_photo_email_notice: eventData.event?.show_photo_email_notice || false,
              checkin_cutoff_enabled: eventData.event?.checkin_cutoff_enabled || false,
              checkin_cutoff_time_male: eventData.event?.checkin_cutoff_time_male || null,
              checkin_cutoff_time_female: eventData.event?.checkin_cutoff_time_female || null,
            });
          }
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch event details:", err);
          }
        }
      }
      
      setQrToken(data.qr_pass_token);
      setShowSignup(false); // Hide signup form when registration succeeds
      setSuccess(true);
      setLoading(false); // Set loading to false after success
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  // Check registration status callback
  const checkRegistration = async (): Promise<boolean> => {
    try {
      const checkResponse = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.registered && checkData.event) {
          setSuccess(true);
          setQrToken(checkData.qr_pass_token);
          setEventDetails({
            name: checkData.event.name,
            venue: checkData.event.venue,
            start_time: checkData.event.start_time,
            flier_url: checkData.event.flier_url,
            checkin_cutoff_enabled: checkData.event.checkin_cutoff_enabled || false,
            checkin_cutoff_time_male: checkData.event.checkin_cutoff_time_male || null,
            checkin_cutoff_time_female: checkData.event.checkin_cutoff_time_female || null,
            attendee_gender: checkData.attendee?.gender || null,
          });
          return true;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error checking registration:", err);
      }
    }
    return false;
  };

  // Debug current state (v2)
  if (process.env.NODE_ENV === "development") {
    console.log("[Register] Render state:", { loading, authenticated, showSignup, success, hasEventDetails: !!eventDetails, error });
  }

  // Show success screen if registration is complete (check this FIRST)
  if (success && eventDetails) {
    const flierUrl = eventDetails.flier_url || eventDataForSignup?.flierUrl || null;
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Rendering success screen", { 
        eventName: eventDetails.name,
        flierUrl,
        eventDetailsFlier: eventDetails.flier_url,
        signupFlier: eventDataForSignup?.flierUrl 
      });
    }
    return (
      <RegistrationSuccess
        eventName={eventDetails.name}
        eventSlug={eventSlug}
        venueName={eventDetails.venue?.name || null}
        venueSlug={eventDetails.venue?.slug || null}
        startTime={eventDetails.start_time || null}
        endTime={eventDetails.end_time || null}
        qrToken={qrToken}
        flierUrl={flierUrl}
        venueAddress={eventDetails.venue?.address || null}
        showPhotoEmailNotice={eventDetails.show_photo_email_notice || false}
        checkinCutoffEnabled={eventDetails.checkin_cutoff_enabled || false}
        checkinCutoffTimeMale={eventDetails.checkin_cutoff_time_male || null}
        checkinCutoffTimeFemale={eventDetails.checkin_cutoff_time_female || null}
        attendeeGender={eventDetails.attendee_gender || null}
      />
    );
  }

  // If success is true but eventDetails is missing, show a fallback success
  if (success && !eventDetails) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Success but no event details - showing fallback");
    }
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4">
        <div className="text-primary text-xl font-bold">Registration Complete!</div>
        <div className="text-secondary">You're all set for the event.</div>
      </div>
    );
  }

  // Show error if there is one
  if (error && !loading) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Rendering error:", error);
    }
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-accent-error text-xl font-bold">Registration Error</div>
        <div className="text-secondary text-center">{error}</div>
        <button 
          onClick={() => { setError(""); setLoading(false); setShowSignup(true); }}
          className="mt-4 px-4 py-2 bg-active text-primary rounded-xl border border-border-subtle hover:border-border-strong transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show loading state for any loading scenario
  if (loading) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Rendering loading state");
    }
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Loading registration..." size="lg" />
      </div>
    );
  }

  // Build redirect URL that preserves the ref parameter
  const buildRedirectUrl = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    
    const url = new URL(window.location.href);
    // Ensure ref is in the URL (from URL or sessionStorage)
    if (ref && !url.searchParams.has("ref")) {
      url.searchParams.set("ref", ref);
    }
    return url.toString();
  };

  // If authenticated, show Typeform signup (skip email step, only show missing fields)
  if (authenticated && userEmail && showSignup) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Rendering TypeformSignup for authenticated user");
    }
    const redirectUrl = buildRedirectUrl() || `/e/${eventSlug}/register`;
    
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={redirectUrl}
        onEmailVerified={checkRegistration}
        eventSlug={eventSlug}
        existingProfile={existingProfile}
        registrationCount={registrationCount}
        eventName={eventDataForSignup?.name}
        eventDetails={eventDataForSignup ? {
          venueName: eventDataForSignup.venueName,
          startTime: eventDataForSignup.startTime,
          registrationCount: eventDataForSignup.registrationCount,
          flierUrl: eventDataForSignup.flierUrl,
        } : undefined}
      />
    );
  }

  // Show Typeform signup for unauthenticated users
  if (!authenticated) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Register] Rendering TypeformSignup for unauthenticated user");
    }
    const redirectUrl = buildRedirectUrl();
    
    // If magic link failed, show password fallback immediately
    const shouldShowPasswordFallback = magicLinkError === "pkce" || magicLinkError === "expired" || magicLinkError === "failed";
    const fallbackReason = magicLinkError as "pkce" | "expired" | "failed" | undefined;
    
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={redirectUrl || undefined}
        onEmailVerified={checkRegistration}
        eventSlug={eventSlug}
        registrationCount={registrationCount}
        forcePasswordFallback={shouldShowPasswordFallback}
        fallbackReason={fallbackReason}
        eventName={eventDataForSignup?.name}
        eventDetails={eventDataForSignup ? {
          venueName: eventDataForSignup.venueName,
          startTime: eventDataForSignup.startTime,
          registrationCount: eventDataForSignup.registrationCount,
          flierUrl: eventDataForSignup.flierUrl,
        } : undefined}
      />
    );
  }

  // Fallback - this should not happen, but handle it gracefully
  if (process.env.NODE_ENV === "development") {
    console.log("[Register] Fallback state reached - this should not happen");
  }
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-4">
      <div className="text-secondary">Something went wrong...</div>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-active text-primary rounded-xl border border-border-subtle hover:border-border-strong transition-colors"
      >
        Refresh Page
      </button>
    </div>
  );
}
