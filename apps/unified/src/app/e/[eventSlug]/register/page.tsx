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
  const [eventDetails, setEventDetails] = useState<{
    name: string;
    venue?: { name: string } | null;
    start_time?: string | null;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (user && user.email) {
        setAuthenticated(true);
        setUserEmail(user.email);
        
        // Always check if already registered first (whether from QR code or direct link)
        try {
          const checkResponse = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            if (checkData.registered && checkData.event) {
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
          console.error("Error checking registration:", checkErr);
          // Continue to signup form if check fails
        }
        
        // Not registered yet - show signup form
        setShowSignup(true);
      } else {
        setAuthenticated(false);
      }
    } catch (err) {
      console.error("Error checking auth:", err);
      setAuthenticated(false);
    } finally {
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

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
      setQrToken(data.qr_pass_token);
      if (data.event) {
        setEventDetails({
          name: data.event.name,
          venue: data.event.venue,
          start_time: data.event.start_time,
        });
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  if (success && eventDetails) {
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

  // If authenticated, show Typeform signup (skip email step)
  if (authenticated && userEmail && showSignup) {
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
      />
    );
  }

  // Show Typeform signup (will handle email verification internally)
  if (!authenticated && !loading) {
    const redirectUrl = typeof window !== "undefined"
      ? new URL(window.location.origin)
      : null;
    if (redirectUrl) {
      redirectUrl.pathname = `/e/${eventSlug}/register`;
      if (ref) {
        redirectUrl.searchParams.set("ref", ref);
      }
    }
    
    return (
      <TypeformSignup
        onSubmit={handleSignupSubmit}
        isLoading={loading}
        redirectUrl={redirectUrl?.toString() || `/e/${eventSlug}/register`}
        onEmailVerified={checkRegistration}
        eventSlug={eventSlug}
      />
    );
  }

  // Loading state (should not reach here as TypeformSignup handles everything)
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white/60">Loading...</div>
    </div>
  );
}
