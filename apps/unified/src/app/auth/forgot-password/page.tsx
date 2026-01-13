"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@crowdstack/ui";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before proceeding
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }
    
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send password reset email");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

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
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-md p-4 bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-success">Check your email</p>
                  <p className="text-sm text-success/80 mt-1">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-success/60 mt-2">
                    Click the link in the email to reset your password. The link will expire in 1 hour.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push("/login")}
              variant="primary"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md bg-input border border-default px-3 py-2 text-primary placeholder-tertiary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
                placeholder="you@example.com"
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
              Send Reset Link
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-accent-primary hover:text-accent-primary/80"
              >
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

