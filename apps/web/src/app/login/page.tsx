"use client";

import { useState } from "react";
import { createBrowserClient } from "@crowdstack/shared";
import { Button, Card } from "@crowdstack/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserClient();
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Use the session directly from login response (don't call getSession again)
      const session = data.session;
      
      if (!session) {
        setError("Failed to create session");
        setLoading(false);
        return;
      }

      // Check for redirect param (from app middleware)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      
      // App URL for cross-port/domain redirects
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007";
      
      // Detect if we're on localhost (need token-sharing) or production (cookies shared via subdomain)
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isRedirectingToApp = redirect?.includes(appUrl) || redirect?.includes("localhost:3007");
      
      // Helper to redirect to app
      const redirectToApp = (path: string) => {
        if (isLocalhost) {
          // LOCALHOST: Use token-sharing endpoint (cookies not shared between ports)
          const sessionUrl = `${appUrl}/api/auth/session?access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}&redirect=${encodeURIComponent(path)}`;
          console.log("[Login] Localhost: Redirecting with tokens");
          window.location.href = sessionUrl;
        } else {
          // PRODUCTION: Direct redirect (cookies shared via .crowdstack.app domain)
          console.log("[Login] Production: Direct redirect to", `${appUrl}${path}`);
          window.location.href = `${appUrl}${path}`;
        }
      };
      
      if (isRedirectingToApp) {
        // Extract path from redirect
        let finalPath = "/admin";
        if (redirect) {
          try {
            finalPath = new URL(redirect).pathname;
          } catch {
            finalPath = redirect.startsWith("/") ? redirect : "/admin";
          }
        }
        redirectToApp(finalPath);
        return;
      }
      
      // Check user roles for automatic app redirect (B2B users)
      const user = data.user;
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (roles && roles.length > 0) {
          const roleNames = roles.map((r: any) => r.role);
          
          // B2B roles go to app
          if (roleNames.includes("venue_admin") || roleNames.includes("event_organizer") || 
              roleNames.includes("promoter") || roleNames.includes("door_staff")) {
            
            // Determine target path based on role
            let targetPath = "/admin";
            if (roleNames.includes("venue_admin")) {
              targetPath = "/app/venue";
            } else if (roleNames.includes("event_organizer")) {
              targetPath = "/app/organizer";
            } else if (roleNames.includes("promoter")) {
              targetPath = "/app/promoter";
            } else if (roleNames.includes("door_staff")) {
              targetPath = "/door";
            }
            
            redirectToApp(targetPath);
            return;
          }
        }
      }
      
      // Default: attendee goes to /me on web
      if (redirect && !isRedirectingToApp) {
        window.location.href = redirect;
      } else {
        window.location.href = "/me";
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserClient();
      
      // Get redirect param to determine where to send user after auth
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");
      
      // Use server-side callback route for more reliable session handling
      const callbackUrl = `${window.location.origin}/api/auth/callback`;
      const redirectTo = redirectParam 
        ? `${callbackUrl}?redirect=${encodeURIComponent(redirectParam)}`
        : callbackUrl;
      
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        setError(magicError.message);
      } else {
        setMessage("Check your email for the magic link!");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Sign In</h1>
          <p className="mt-2 text-sm text-white/60">
            {useMagicLink ? "Enter your email to receive a magic link" : "Enter your email and password"}
          </p>
        </div>

        <form onSubmit={useMagicLink ? handleMagicLink : handlePasswordLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-[#0B0D10] border border-[#2A2F3A] px-3 py-2 text-white placeholder-white/40 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          {!useMagicLink && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-[#0B0D10] border border-[#2A2F3A] px-3 py-2 text-white placeholder-white/40 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-colors"
                placeholder="Enter your password"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="rounded-md p-4 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]">
              <p className="text-sm">{message}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
            size="lg"
          >
            {useMagicLink ? "Send Magic Link" : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(!useMagicLink);
                setError("");
                setMessage("");
              }}
              className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80"
            >
              {useMagicLink ? "Use password instead" : "Use magic link instead"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
