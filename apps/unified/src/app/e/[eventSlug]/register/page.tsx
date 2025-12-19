"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { RegistrationSuccess } from "@/components/RegistrationSuccess";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref"); // referral code (promoter/venue ID)
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
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null>(null);
  const [eventDetails, setEventDetails] = useState<{
    name: string;
    venue?: { name: string } | null;
    start_time?: string | null;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log("[Register] checkAuth started");
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("[Register] User check:", { hasUser: !!user, email: user?.email, error: error?.message });

      if (user && user.email) {
        setAuthenticated(true);
        setUserEmail(user.email);
        console.log("[Register] User is authenticated:", user.email);
        
        // Always check if already registered first (whether from QR code or direct link)
        try {
          console.log("[Register] Checking if already registered for event:", eventSlug);
          const checkResponse = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
          console.log("[Register] Check registration response status:", checkResponse.status);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            console.log("[Register] Check registration data:", checkData);
            if (checkData.registered && checkData.event) {
              console.log("[Register] User is already registered! Showing success screen");
              // User is already registered - show success screen immediately
              setSuccess(true);
              setQrToken(checkData.qr_pass_token);
              setEventDetails({
                name: checkData.event.name,
                venue: checkData.event.venue,
                start_time: checkData.event.start_time,
              });
              setLoading(false);
              return;
            }
          }
        } catch (checkErr) {
          console.error("[Register] Error checking registration:", checkErr);
          // Continue to registration if check fails
        }
        
        // Not registered yet - check if user has existing profile
        console.log("[Register] Not registered yet, checking profile...");
        try {
          const profileResponse = await fetch("/api/profile");
          console.log("[Register] Profile response status:", profileResponse.status);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            const attendee = profileData.attendee;
            console.log("[Register] Profile data:", attendee);
            
            if (attendee) {
              // Store existing profile to pre-fill form
              setExistingProfile({
                name: attendee.name,
                surname: attendee.surname,
                date_of_birth: attendee.date_of_birth,
                whatsapp: attendee.whatsapp,
                instagram_handle: attendee.instagram_handle,
              });
              
              // Check if profile has all required fields
              const hasRequiredFields = 
                attendee.name && 
                attendee.whatsapp && 
                attendee.surname && 
                attendee.date_of_birth && 
                attendee.instagram_handle;
              
              console.log("[Register] Has all required fields:", hasRequiredFields, {
                name: !!attendee.name,
                whatsapp: !!attendee.whatsapp,
                surname: !!attendee.surname,
                date_of_birth: !!attendee.date_of_birth,
                instagram_handle: !!attendee.instagram_handle,
              });
              
              if (hasRequiredFields) {
                // Profile is complete - register them automatically
                console.log("[Register] Auto-registering user with complete profile...");
                try {
                  await handleSignupSubmit({
                    email: user.email,
                    name: attendee.name,
                    surname: attendee.surname,
                    date_of_birth: attendee.date_of_birth,
                    whatsapp: attendee.whatsapp,
                    instagram_handle: attendee.instagram_handle,
                  });
                  console.log("[Register] Auto-registration complete");
                } catch (autoRegErr) {
                  console.error("[Register] Auto-registration failed:", autoRegErr);
                  // If auto-registration fails, show the signup form
                  setShowSignup(true);
                  setLoading(false);
                }
                return;
              }
            }
          }
        } catch (profileErr) {
          console.error("[Register] Error checking profile:", profileErr);
          // Continue to signup form if profile check fails
        }
        
        // Profile incomplete or check failed - show signup form
        console.log("[Register] Profile incomplete, showing signup form");
        setShowSignup(true);
        setLoading(false);
      } else {
        console.log("[Register] User is not authenticated");
        setAuthenticated(false);
        setLoading(false);
      }
    } catch (err) {
      console.error("[Register] Error in checkAuth:", err);
      setAuthenticated(false);
      setLoading(false);
    }
  };

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
      console.log("handleSignupSubmit called with:", signupData);
      
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

      console.log("Sending registration request:", requestBody);
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log("[Register] Registration response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error("[Register] Registration failed:", data.error, data.details);
        throw new Error(data.error || data.details || "Registration failed");
      }

      // Always set event details, even if data.event is missing (will fetch if needed)
      if (data.event) {
        setEventDetails({
          name: data.event.name,
          venue: data.event.venue,
          start_time: data.event.start_time,
        });
      } else {
        // If event details not in response, fetch them
        try {
          const eventResponse = await fetch(`/api/events/by-slug/${eventSlug}`);
          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            setEventDetails({
              name: eventData.name,
              venue: eventData.venue || null,
              start_time: eventData.start_time || null,
            });
          }
        } catch (err) {
          console.error("Failed to fetch event details:", err);
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
          });
          return true;
        }
      }
    } catch (err) {
      console.error("Error checking registration:", err);
    }
    return false;
  };

  // Debug current state (v2)
  console.log("[Register] Render state:", { loading, authenticated, showSignup, success, hasEventDetails: !!eventDetails, error });

  // Show success screen if registration is complete (check this FIRST)
  if (success && eventDetails) {
    console.log("[Register] Rendering success screen");
    return (
      <RegistrationSuccess
        eventName={eventDetails.name}
        eventSlug={eventSlug}
        venueName={eventDetails.venue?.name || null}
        startTime={eventDetails.start_time || null}
        qrToken={qrToken}
      />
    );
  }

  // If success is true but eventDetails is missing, show a fallback success
  if (success && !eventDetails) {
    console.log("[Register] Success but no event details - showing fallback");
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl">Registration Complete!</div>
        <div className="text-white/60">You're all set for the event.</div>
      </div>
    );
  }

  // Show error if there is one
  if (error && !loading) {
    console.log("[Register] Rendering error:", error);
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-red-400 text-xl">Registration Error</div>
        <div className="text-white/60 text-center">{error}</div>
        <button 
          onClick={() => { setError(""); setLoading(false); setShowSignup(true); }}
          className="mt-4 px-4 py-2 bg-white/10 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show loading state for any loading scenario
  if (loading) {
    console.log("[Register] Rendering loading state");
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // If authenticated, show Typeform signup (skip email step, only show missing fields)
  if (authenticated && userEmail && showSignup) {
    console.log("[Register] Rendering TypeformSignup for authenticated user");
    const redirectUrl = typeof window !== "undefined" 
      ? window.location.href 
      : `/e/${eventSlug}/register`;
    
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={redirectUrl}
        onEmailVerified={checkRegistration}
        eventSlug={eventSlug}
        existingProfile={existingProfile}
      />
    );
  }

  // Show Typeform signup for unauthenticated users
  if (!authenticated) {
    console.log("[Register] Rendering TypeformSignup for unauthenticated user");
    const redirectUrl = typeof window !== "undefined"
      ? window.location.href
      : null;
    
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={redirectUrl || undefined}
        onEmailVerified={checkRegistration}
        eventSlug={eventSlug}
      />
    );
  }

  // Fallback - this should not happen, but handle it gracefully
  console.log("[Register] Fallback state reached - this should not happen");
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="text-white/60">Something went wrong...</div>
      <button 
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-white/10 text-white rounded-lg"
      >
        Refresh Page
      </button>
    </div>
  );
}
