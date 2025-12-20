"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { Card, Button, Input } from "@crowdstack/ui";

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("");

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        // Already logged in - redirect to accept page
        router.push(`/invite/${token}`);
        return;
      }

      // Validate token exists
      try {
        const response = await fetch(`/api/invites/${token}`);
        if (response.ok) {
          const data = await response.json();
          setTokenValid(true);
          setInviteRole(data.role || "");
        } else {
          setTokenValid(false);
        }
      } catch (err) {
        setTokenValid(false);
      }
    };

    checkAuth();
  }, [token, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/invites/${token}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.existingAccount) {
          // User exists - redirect to login
          router.push(`/login?redirect=/invite/${token}&email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.error || "Failed to sign up");
      }

      // Sign in the user with password (account was just created)
      const supabase = createBrowserClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Failed to sign in after account creation:", signInError);
        setError("Account created but failed to sign in. Please log in manually.");
        setLoading(false);
        return;
      }

      // Redirect to the appropriate dashboard
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        router.push("/app/organizer"); // Default fallback
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up. Please try again.");
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
            <p className="text-white/60">Validating invite...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Invite</h1>
            <p className="text-white/60 mb-4">
              This invite link is invalid or has expired.
            </p>
            <Button onClick={() => router.push("/login")} variant="primary">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Sign Up
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Create your account to accept the invite{inviteRole && ` as ${inviteRole.replace("_", " ")}`}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-md p-4 bg-red-500/10 border border-red-500/20 text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            disabled={loading}
            minLength={6}
          />

          <Input
            label="Confirm Password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            disabled={loading}
            minLength={6}
          />

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
            size="lg"
          >
            Create Account & Accept Invite
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push(`/login?redirect=/invite/${token}`)}
              className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80"
            >
              Already have an account? Log in instead
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

