"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@crowdstack/shared";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Button, Card } from "@crowdstack/ui";

// Singleton magic link client to avoid "Multiple GoTrueClient instances" warning
let magicLinkClientInstance: SupabaseClient | null = null;

function getMagicLinkClient(): SupabaseClient {
  if (magicLinkClientInstance) {
    return magicLinkClientInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  magicLinkClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // We handle this manually
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  
  return magicLinkClientInstance;
}

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
      
      // Note: We do NOT sign out before password login because:
      // 1. Password login explicitly authenticates with credentials, so the right user will be authenticated
      // 2. signOut() clears the custom localhost cookie that the server needs for auth
      
      console.log("[Login] Attempting password login for:", email);
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[Login] Password login error:", signInError.message);
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Use the session directly from login response (don't call getSession again)
      const session = data.session;
      
      console.log("[Login] Password login response:", {
        hasSession: !!session,
        hasUser: !!data.user,
        userEmail: data.user?.email,
      });
      
      if (!session) {
        console.error("[Login] No session in response");
        setError("Failed to create session");
        setLoading(false);
        return;
      }

      console.log("[Login] Session created for:", data.user?.email);
      
      // IMPORTANT: Set the custom cookie format that the server-side expects
      // This ensures the server can read the session on localhost
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const cookieName = `sb-${projectRef}-auth-token`;
      
      // Create the cookie value in the format the server expects
      const cookieValue = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      });
      
      // Set the cookie (expires when session expires)
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : undefined;
      const cookieOptions = expiresAt 
        ? `; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
        : `; path=/; SameSite=Lax`;
      document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}${cookieOptions}`;
      
      console.log("[Login] Custom cookie set for server-side auth");
      
      // Verify session is accessible (this also ensures cookies are set)
      const { data: { session: verifySession }, error: sessionError } = await supabase.auth.getSession();
      console.log("[Login] Session verification:", {
        hasSession: !!verifySession,
        userEmail: verifySession?.user?.email,
        error: sessionError?.message,
      });
      
      if (!verifySession) {
        console.error("[Login] Session not accessible after login. Error:", sessionError);
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (!retrySession) {
          setError("Session not accessible. Please try again.");
          setLoading(false);
          return;
        }
        console.log("[Login] Session accessible on retry");
      }

      // Check for redirect param (from middleware)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      
      console.log("[Login] Redirect param:", redirect);
      
      // Check if redirect is to app routes (/app/*, /door/*, /admin)
      const isRedirectingToApp = redirect?.startsWith("/app") || 
                                  redirect?.startsWith("/door") || 
                                  redirect?.startsWith("/admin");
      
      if (isRedirectingToApp) {
        // Extract path from redirect (could be full URL or just path)
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
        console.log("[Login] Redirecting to app path:", finalPath);
        // Small delay to ensure cookies are fully set before redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = finalPath;
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
              roleNames.includes("promoter") || roleNames.includes("door_staff") ||
              roleNames.includes("superadmin")) {
            
            // Determine target path based on role
            let targetPath = "/admin";
            if (roleNames.includes("superadmin")) {
              targetPath = "/admin";
            } else if (roleNames.includes("venue_admin")) {
              targetPath = "/app/venue";
            } else if (roleNames.includes("event_organizer")) {
              targetPath = "/app/organizer";
            } else if (roleNames.includes("promoter")) {
              targetPath = "/app/promoter";
            } else if (roleNames.includes("door_staff")) {
              targetPath = "/door";
            }
            
            console.log("[Login] Redirecting B2B user to:", targetPath);
            // Small delay to ensure cookies are fully set before redirect
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = targetPath;
            return;
          }
        }
      }
      
      // Default: attendee goes to /me
      const finalRedirect = redirect && !isRedirectingToApp ? redirect : "/me";
      console.log("[Login] Redirecting to default path:", finalRedirect);
      
      // Small delay to ensure cookies are fully set before redirect
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.href = finalRedirect;
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
      // Use singleton client to avoid "Multiple GoTrueClient instances" warning
      const supabase = getMagicLinkClient();
      
      // Clear any existing session data (ignore errors - it's fine if no session exists)
      // This prevents the old session from interfering with the new one
      try {
        await supabase.auth.signOut({ scope: 'local' }); // Use local scope to avoid 403 errors
      } catch {
        // Ignore signOut errors - there may be no session to sign out
      }
      
      // Also clear the custom cookie manually
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const cookieName = `sb-${projectRef}-auth-token`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      // Clear any old PKCE code verifiers and session data from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('code-verifier') || key.includes('auth-token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Get redirect param to determine where to send user after auth
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");
      
      // Use CLIENT-SIDE page for callback - this allows access to localStorage
      // where the browser client stores the PKCE code verifier
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const redirectTo = redirectParam 
        ? `${callbackUrl}?redirect=${encodeURIComponent(redirectParam)}`
        : callbackUrl;
      
      console.log("[Login] Requesting magic link for:", email);
      const { data, error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        console.error("[Login] Magic link error:", magicError.message);
        // If signups are disabled, try to provide helpful error
        if (magicError.message.includes("signup") || magicError.message.includes("Signup disabled")) {
          setError("New signups are currently disabled. Please contact support to create an account.");
        } else {
          setError(magicError.message);
        }
      } else {
        console.log("[Login] Magic link sent successfully");
        setMessage("✅ Check your email for the magic link! If you're a new user, clicking the link will create your account. ⚠️ Important: Click the link in the SAME browser where you requested it (can be a different tab).");
      }
    } catch (err: any) {
      console.error("[Login] Magic link exception:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            {useMagicLink ? "Sign Up / Sign In" : "Sign In"}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {useMagicLink 
              ? "Enter your email to receive a magic link. Works for both new signups and existing users." 
              : "Enter your email and password to sign in to your existing account"}
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
                    <li>If testing a <strong>different user</strong>, clear cookies first or sign out of the current session</li>
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
            {useMagicLink ? "Send Magic Link (Sign Up / Sign In)" : "Sign In"}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setUseMagicLink(!useMagicLink);
                setError("");
                setMessage("");
              }}
              className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80"
            >
              {useMagicLink ? "Use password instead" : "Use magic link instead (Sign Up / Sign In)"}
            </button>
            {useMagicLink && (
              <p className="text-xs text-white/40">
                Magic link works for both new signups and existing users. No password needed!
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
