"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { Button, Card } from "@crowdstack/ui";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(false);

  // Read error from URL params (from auth callback redirect)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const detailsParam = searchParams.get("details");
    const messageParam = searchParams.get("message");
    
    if (errorParam) {
      if (errorParam === "auth_failed") {
        setError(detailsParam || "Authentication failed. Please try again.");
      } else if (errorParam === "pkce_error") {
        setError(messageParam || "PKCE code verifier not found. Please clear cookies and try again, or use password login.");
      } else {
        setError(detailsParam || messageParam || "An error occurred. Please try again.");
      }
    }
  }, [searchParams]);

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
      
      // Detect environment
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isLocalDev = isLocalhost || process.env.NEXT_PUBLIC_APP_ENV === "local";
      
      // In local dev with unified origin, everything is on 3006
      // In production, app is on separate subdomain
      const appUrl = isLocalDev 
        ? window.location.origin  // Same origin (3006) in local dev
        : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3007");
      
      // Check if redirect is to app routes (/app/* or /door/*) or contains old 3007 URL
      const isRedirectingToApp = redirect?.startsWith("/app") || 
                                  redirect?.startsWith("/door") || 
                                  redirect?.includes("/admin") ||
                                  redirect?.includes("localhost:3007") ||
                                  redirect?.includes(appUrl);
      
      // Helper to redirect to app
      const redirectToApp = (path: string) => {
        if (isLocalDev) {
          // LOCAL DEV (unified origin): Direct redirect to same origin (cookies shared)
          console.log("[Login] Local dev: Redirecting to same origin", path);
          window.location.href = path;
        } else {
          // PRODUCTION: Redirect to app subdomain (cookies shared via .crowdstack.app domain)
          console.log("[Login] Production: Redirecting to app", `${appUrl}${path}`);
          window.location.href = `${appUrl}${path}`;
        }
      };
      
      if (isRedirectingToApp) {
        // Extract path from redirect
        let finalPath = "/admin";
        if (redirect) {
          try {
            // If it's a full URL, extract the pathname
            finalPath = new URL(redirect).pathname;
          } catch {
            // If it's just a path, use it directly
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
      
      // Use server-side API callback route for magic link handling
      // This ensures PKCE code verifier is handled properly via cookies
      const callbackUrl = `${window.location.origin}/api/auth/callback`;
      const redirectTo = redirectParam 
        ? `${callbackUrl}?redirect=${encodeURIComponent(redirectParam)}`
        : callbackUrl;
      
      // signInWithOtp will create a new user automatically if they don't exist
      // (only if signups are enabled in Supabase Auth settings)
      // This works for both sign in and sign up - no separate signup flow needed
      const { data, error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        // If signups are disabled, try to provide helpful error
        if (magicError.message.includes("signup") || magicError.message.includes("Signup disabled")) {
          setError("New signups are currently disabled. Please contact support to create an account.");
        } else {
          setError(magicError.message);
        }
      } else {
        setMessage("Check your email for the magic link! If you're a new user, clicking the link will create your account. ⚠️ Important: Click the link in the SAME browser where you're logged in now (can be a different tab).");
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
          <h1 className="text-3xl font-bold text-white">Sign In / Sign Up</h1>
          <p className="mt-2 text-sm text-white/60">
            {useMagicLink 
              ? "Enter your email to receive a magic link (works for both new and existing users)" 
              : "Enter your email and password to sign in"}
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
              <p className="text-sm font-medium">Authentication Error</p>
              <p className="text-sm mt-1">{error}</p>
              {(typeof window !== "undefined" && window.location.search.includes("error=pkce_error")) && (
                <div className="text-xs mt-2 opacity-80 space-y-1">
                  <p><strong>Magic Link Limitation:</strong> Magic links must be opened in the same browser where you requested them.</p>
                  <p className="mt-1">💡 <strong>Solutions:</strong></p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Make sure you click the link in the <strong>same browser</strong> (can be different tab)</li>
                    <li>Don't clear cookies between requesting and clicking the link</li>
                    <li>Try <strong>password login</strong> instead if this keeps happening</li>
                  </ul>
                </div>
              )}
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
