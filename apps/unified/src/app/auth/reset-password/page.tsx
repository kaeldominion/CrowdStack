"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@crowdstack/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

export default function ResetPasswordPage() {
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
        
        // Check if there's a hash in the URL (token from email)
        const hash = window.location.hash;
        if (hash) {
          // Supabase automatically processes the hash and creates a session
          // Wait a bit for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            setIsValidToken(true);
          } else {
            // Try to get the user to see if they're authenticated
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              setIsValidToken(true);
            } else {
              setIsValidToken(false);
            }
          }
        } else {
          // No hash, check if there's already a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidToken(true);
          } else {
            setIsValidToken(false);
          }
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
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6] mx-auto mb-4"></div>
            <p className="text-white/60">Verifying reset link...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Invalid Reset Link</h1>
            <p className="mt-2 text-sm text-white/60">
              This password reset link is invalid or has expired.
            </p>
          </div>

          {error && (
            <div className="rounded-md p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] mb-6">
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
              className="block text-center text-sm text-[#3B82F6] hover:text-[#3B82F6]/80"
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
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/10">
              <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Password Reset Successful</h1>
              <p className="mt-2 text-sm text-white/60">
                Your password has been reset. Redirecting to login...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-white/60">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
              New Password
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-[#0B0D10] border border-[#2A2F3A] px-3 py-2 text-white placeholder-white/40 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
              placeholder="At least 6 characters"
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md bg-[#0B0D10] border border-[#2A2F3A] px-3 py-2 text-white placeholder-white/40 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
              placeholder="Confirm your password"
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-md p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]">
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

