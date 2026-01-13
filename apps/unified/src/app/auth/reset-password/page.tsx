"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, LoadingSpinner } from "@crowdstack/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session (user clicked the reset link)
    const checkSession = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Log full URL for debugging
        console.log("[Reset Password] Full URL:", window.location.href);
        console.log("[Reset Password] Pathname:", window.location.pathname);
        console.log("[Reset Password] Search:", window.location.search);
        console.log("[Reset Password] Hash:", window.location.hash);
        
        // Check if there's a hash in the URL (token from email)
        const hash = window.location.hash;
        if (hash) {
          // Parse the hash to check for recovery token
          const hashParams = new URLSearchParams(hash.substring(1)); // Remove # and parse
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          // Check if this is a password recovery link
          if (type === 'recovery' && accessToken) {
            // Set the session using the tokens from the hash
            const { data: { session }, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (session && !sessionError) {
              setIsValidToken(true);
              // Clear the hash from URL for security
              window.history.replaceState(null, '', window.location.pathname);
              return;
            } else {
              console.error("[Reset Password] Error setting session:", sessionError);
              setIsValidToken(false);
              return;
            }
          }
          
          // If not a recovery token, try to get existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && !error) {
            setIsValidToken(true);
            return;
          }
        }
        
        // No hash or hash didn't work, check if there's already a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch (err) {
        console.error("[Reset Password] Error checking session:", err);
        setIsValidToken(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login?message=Password reset successfully. Please sign in with your new password.");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner text="Verifying reset link..." size="md" />
          </div>
        </Card>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">Invalid Reset Link</h1>
            <p className="mt-2 text-sm text-secondary">
              This password reset link is invalid or has expired.
            </p>
          </div>

          {error && (
            <div className="rounded-md p-4 bg-error/10 border border-error/20 text-error mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={() => router.push("/auth/forgot-password")}
              variant="primary"
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-accent-primary hover:text-accent-primary/80"
            >
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">Password Reset Successful</h1>
              <p className="mt-2 text-sm text-secondary">
                Your password has been reset. Redirecting to login...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Reset Password</h1>
          <p className="mt-2 text-sm text-secondary">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
              New Password
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-input border border-default px-3 py-2 text-primary placeholder-tertiary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
              placeholder="At least 6 characters"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md bg-input border border-default px-3 py-2 text-primary placeholder-tertiary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-md p-4 bg-error/10 border border-error/20 text-error">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            variant="primary"
            className="w-full"
            size="lg"
          >
            Reset Password
          </Button>
        </form>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner text="Loading..." size="md" />
        </div>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

