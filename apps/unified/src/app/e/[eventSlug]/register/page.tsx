"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { TypeformSignup, type SignupData } from "@/components/TypeformSignup";
import { Container, Section, Button, Card } from "@crowdstack/ui";
import { CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";

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
        email: userEmail, // Email from magic link
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

  if (success) {
    return (
      <Section spacing="xl" className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <Container size="sm" className="flex items-center justify-center min-h-screen">
          <Card className="text-center w-full max-w-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Registration Successful!</h1>
            <p className="mt-4 text-foreground-muted">
              Your QR pass has been generated.
            </p>
            <div className="mt-6">
              <Link href={`/e/${eventSlug}/pass?token=${qrToken}`}>
                <Button variant="primary" size="lg" className="w-full">
                  View QR Pass
                </Button>
              </Link>
            </div>
          </Card>
        </Container>
      </Section>
    );
  }

  // If authenticated, show Typeform signup
  if (authenticated && userEmail && showSignup) {
    return (
      <TypeformSignup
        email={userEmail}
        onSubmit={handleSignupSubmit}
        isLoading={loading}
      />
    );
  }

  // Show magic link login
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Sign in to Register
            </h1>
            <p className="text-foreground-muted">
              We'll send you a magic link to sign in or create your account
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-error/10 border border-error/20 p-4 mb-6">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              value={userEmail || ""}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMagicLink();
                }
              }}
              placeholder="your@email.com"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <Button
              onClick={handleMagicLink}
              disabled={loading || !userEmail}
              loading={loading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Send Magic Link
            </Button>

            <p className="text-xs text-foreground-muted text-center mt-4">
              Click the link in your email in the same browser to continue
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
