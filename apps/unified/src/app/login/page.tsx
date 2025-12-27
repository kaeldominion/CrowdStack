"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Button, Card, PageLoader, Logo, Input } from "@crowdstack/ui";

// Detect iOS Safari for OTP-first flow
const isIOSSafari = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  // Also check for in-app browsers (Mail, Gmail, etc.)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line|Messenger|WhatsApp/.test(ua);
  return isIOS || isSafari || isInAppBrowser;
};

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

function LoadingFallback() {
  return <PageLoader message="Loading..." />;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(true); // Magic link is primary
  const [isSignup, setIsSignup] = useState(false);
  const submittingRef = useRef(false);
  
  // OTP verification state
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Detect mobile/iOS on mount
  useEffect(() => {
    setIsMobileDevice(isIOSSafari());
  }, []);

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

  const handlePasswordSignup = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Starting password signup for:", email);
      }
      
      // Use API endpoint to create account (bypasses email confirmation and rate limits)
      // Add timeout to prevent indefinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let response: Response;
      try {
        response = await fetch("/api/auth/password-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Login] API response status:", response.status);
      }
      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] API response data:", data);
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Account created or exists - now sign in with password
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Account ready, attempting sign in...");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const supabase = createBrowserClient();
      
      // Try to sign in with password (retry up to 3 times)
      let signInSuccess = false;
      let signInError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[Login] Sign in attempt ${attempt + 1}...`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInErr && signInData.session) {
          signInSuccess = true;
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Sign in successful, redirecting...");
          }
          // Continue with the same redirect logic as password login
          await handleSuccessfulAuth(signInData);
          return;
        }
        
        signInError = signInErr;
        if (process.env.NODE_ENV === "development") {
          console.log(`[Login] Sign in attempt ${attempt + 1} failed:`, signInErr?.message);
        }
      }

      if (!signInSuccess) {
        // If user exists but password doesn't work, show helpful message
        if (data.userExists) {
          throw new Error("Could not sign in. Please check your password or use the 'Forgot password' option.");
        }
        throw new Error(`Account created but failed to sign in: ${signInError?.message || "Unknown error"}. Please try logging in manually.`);
      }
    } catch (err: any) {
      console.error("[Login] Password signup error:", err);
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessfulAuth = async (authData: any) => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] handleSuccessfulAuth called");
      }
      const session = authData.session;
      
      if (!session) {
        console.error("[Login] No session in authData");
        setError("Failed to create session");
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Setting auth cookie...");
      }
      // Set custom cookie for server-side auth
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const cookieName = `sb-${projectRef}-auth-token`;
      
      const cookieValue = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      });
      
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : undefined;
      const cookieOptions = expiresAt 
        ? `; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
        : `; path=/; SameSite=Lax`;
      document.cookie = `${cookieName}=${encodeURIComponent(cookieValue)}${cookieOptions}`;

      // Skip session verification - we already have a valid session from sign in
      // The getSession() call can sometimes hang, so just proceed with redirect
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Session set, proceeding to redirect...");
      }

      // Check for redirect param
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Redirect param:", redirect);
      }
      
      const isRedirectingToApp = redirect?.startsWith("/app") || 
                                  redirect?.startsWith("/door") || 
                                  redirect?.startsWith("/admin");
      
      if (isRedirectingToApp) {
        let finalPath = "/admin";
        if (redirect) {
          try {
            finalPath = new URL(redirect).pathname;
          } catch {
            finalPath = redirect.startsWith("/") ? redirect : "/admin";
          }
        }
        if (process.env.NODE_ENV === "development") {
          console.log("[Login] Redirecting to app path:", finalPath);
        }
        window.location.href = finalPath;
        return;
      }
      
      // Skip client-side roles check - let server middleware handle role-based redirects
      // This avoids race conditions where the new Supabase client doesn't have the session yet
      // The /me page will check roles and redirect B2B users appropriately
      const finalRedirect = redirect || "/me";
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Redirecting to:", finalRedirect);
      }
      window.location.href = finalRedirect;
    } catch (err: any) {
      console.error("[Login] handleSuccessfulAuth error:", err);
      setError("Authentication succeeded but redirect failed. Please go to /me manually.");
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignup) {
      await handlePasswordSignup();
      return;
    }
    
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createBrowserClient();
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Attempting password login for:", email);
      }
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

      await handleSuccessfulAuth(data);

      // Use the session directly from login response (don't call getSession again)
      const session = data.session;
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Password login response:", {
          hasSession: !!session,
          hasUser: !!data.user,
          userEmail: data.user?.email,
        });
      }
      
      if (!session) {
        console.error("[Login] No session in response");
        setError("Failed to create session");
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Session created for:", data.user?.email);
      }
      
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
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Custom cookie set for server-side auth");
      }
      
      // Verify session is accessible (this also ensures cookies are set)
      const { data: { session: verifySession }, error: sessionError } = await supabase.auth.getSession();
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Session verification:", {
          hasSession: !!verifySession,
          userEmail: verifySession?.user?.email,
          error: sessionError?.message,
        });
      }
      
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
        if (process.env.NODE_ENV === "development") {
          console.log("[Login] Session accessible on retry");
        }
      }

      // Check for redirect param (from middleware)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Redirect param:", redirect);
      }
      
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
        if (process.env.NODE_ENV === "development") {
          console.log("[Login] Redirecting to app path:", finalPath);
        }
        // Small delay to ensure cookies are fully set before redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = finalPath;
        return;
      }
      
      // Check user roles for automatic app redirect (B2B users)
      const user = data.user;
      if (user) {
        try {
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          // If query fails, log but don't block login - user will go to default /me
          if (rolesError) {
            console.warn("[Login] Could not fetch user roles:", rolesError.message);
          } else if (roles && roles.length > 0) {
            const roleNames = roles.map((r: any) => r.role);
            
            // B2B roles go to app
            if (roleNames.includes("venue_admin") || roleNames.includes("event_organizer") || 
                roleNames.includes("promoter") || roleNames.includes("door_staff") ||
                roleNames.includes("superadmin")) {
              
              // Determine target path based on role
              let targetPath = "/admin";
              if (roleNames.includes("superadmin")) {
                targetPath = "/admin";
              } else if (roleNames.includes("door_staff")) {
                targetPath = "/door";
              } else if (roleNames.includes("venue_admin") || roleNames.includes("event_organizer") || roleNames.includes("promoter")) {
                // All B2B roles go to unified workspace
                targetPath = "/app";
              }
              
              if (process.env.NODE_ENV === "development") {
                console.log("[Login] Redirecting B2B user to:", targetPath);
              }
              // Small delay to ensure cookies are fully set before redirect
              await new Promise(resolve => setTimeout(resolve, 300));
              window.location.href = targetPath;
              return;
            }
          }
        } catch (rolesErr: any) {
          // If roles check fails, continue to default redirect (/me)
          console.warn("[Login] Error checking user roles, redirecting to default:", rolesErr.message);
        }
      }
      
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email before proceeding
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }
    
    // Prevent duplicate submissions
    if (submittingRef.current || loading) {
      return;
    }
    
    submittingRef.current = true;
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
      // Use window.location.origin to ensure correct domain (beta.crowdstack.app, not localhost)
      const callbackUrl = `${window.location.origin}/auth/callback`;
      const redirectTo = redirectParam 
        ? `${callbackUrl}?redirect=${encodeURIComponent(redirectParam)}`
        : callbackUrl;
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Requesting magic link for:", trimmedEmail);
        console.log("[Login] Using redirect URL:", redirectTo);
      }
      const { data, error: magicError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        console.error("[Login] Magic link error:", magicError);
        console.error("[Login] Error code:", magicError.status);
        console.error("[Login] Error message:", magicError.message);
        
        const errorMsg = magicError.message.toLowerCase();
        
        // Handle rate limit errors - be more specific with checks
        if (errorMsg.includes("email rate limit exceeded") || 
            (errorMsg.includes("rate limit") && errorMsg.includes("email")) ||
            errorMsg.includes("too many requests") ||
            (errorMsg.includes("too many") && errorMsg.includes("email"))) {
          setError("Email rate limit exceeded. Please wait a few minutes before requesting another magic link. You can check your email for a previous link, or try password login if you have an account.");
        } else if (magicError.message.includes("signup") || magicError.message.includes("Signup disabled")) {
          setError("New signups are currently disabled. Please contact support to create an account.");
        } else {
          // Show the actual error message so we can debug what's really happening
          setError(magicError.message || "An error occurred. Please try again or contact support.");
        }
      } else {
        if (process.env.NODE_ENV === "development") {
          console.log("[Login] Magic link sent successfully");
        }
        setMagicLinkSent(true);
        // Always show OTP input (OTP-only flow)
        setShowOtpInput(true);
      }
    } catch (err: any) {
      console.error("[Login] Magic link exception:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // OTP Verification - for iOS/Safari users who can't use magic links
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 8) {
      setOtpError("Please enter the 8-digit code from your email");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      // Use the same singleton client that sent the OTP to avoid multiple instances
      const supabase = getMagicLinkClient();
      
      if (process.env.NODE_ENV === "development") {
        console.log("[OTP Verify] Attempting verification for:", email, "with code length:", otpCode.trim().length);
      }
      
      // Try all possible OTP types in order with timeout
      const typesToTry = ["email", "signup", "magiclink"];
      let data = null;
      let verifyError = null;
      const trimmedCode = otpCode.trim();
      
      for (const type of typesToTry) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[OTP Verify] Trying type: ${type}`);
        }
        
        try {
          // Add timeout to each verification attempt
          const verifyPromise = supabase.auth.verifyOtp({
            email,
            token: trimmedCode,
            type: type as any,
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Verification timeout")), 10000)
          );
          
          const result = await Promise.race([verifyPromise, timeoutPromise]) as any;
          
          if (!result.error && result.data?.session) {
            if (process.env.NODE_ENV === "development") {
              console.log(`[OTP Verify] Success with type: ${type}`);
            }
            data = result.data;
            verifyError = null;
            break;
          } else if (result.error) {
            if (process.env.NODE_ENV === "development") {
              console.log(`[OTP Verify] Failed with type ${type}:`, result.error.message);
            }
            verifyError = result.error;
            // Continue to next type unless it's a clear non-retryable error
            if (result.error.message.includes("User not found") || 
                result.error.message.includes("Email rate limit")) {
              break; // Don't retry for these errors
            }
          }
        } catch (timeoutErr: any) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[OTP Verify] Timeout for type ${type}`);
          }
          verifyError = { message: "Verification timed out. Please try again." };
          break;
        }
      }

      if (verifyError) {
        console.error("[OTP Verify] All types failed. Last error:", verifyError.message);
        if (verifyError.message.includes("expired") || verifyError.message.includes("Token has expired") || verifyError.message.includes("has expired")) {
          setOtpError("Code expired. The code is only valid for 60 seconds. Please request a new code.");
        } else if (verifyError.message.includes("invalid") || verifyError.message.includes("Token") || verifyError.message.includes("Invalid")) {
          setOtpError("Invalid code. Please check the 8-digit code from your email and try again.");
        } else if (verifyError.message.includes("User not found")) {
          setOtpError("User not found. Please request a new code.");
        } else if (verifyError.message.includes("timeout")) {
          setOtpError("Verification timed out. Please try again.");
        } else {
          setOtpError(`Verification failed: ${verifyError.message}. Please try requesting a new code.`);
        }
        return;
      }

      if (!data?.session) {
        setOtpError("Verification failed. Please try again.");
        return;
      }

      // Successfully verified!
      if (process.env.NODE_ENV === "development") {
        console.log("[OTP Verify] Success for:", email);
      }
      await handleSuccessfulAuth(data);
    } catch (err: any) {
      console.error("[OTP Verify] Exception:", err);
      setOtpError(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo variant="tricolor" size="lg" />
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">
            {useMagicLink ? "Welcome" : (isSignup ? "Create Account" : "Sign In")}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {useMagicLink 
              ? "Enter your email to sign in or create an account" 
              : isSignup
              ? "Create a new account with email and password"
              : "Sign in with your email and password"}
          </p>
        </div>

        <form onSubmit={useMagicLink ? handleMagicLink : handlePasswordLogin} className="space-y-6">
          {!showOtpInput && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
              Email
            </label>
            <Input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          )}

          {!useMagicLink && !showOtpInput && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                  minLength={isSignup ? 6 : undefined}
                />
              </div>
              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-primary mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                </div>
              )}
              {!isSignup && (
                <div className="text-right">
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-accent-secondary hover:text-accent-secondary/80"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="rounded-md p-4 bg-accent-error/10 border border-accent-error/20 text-accent-error">
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

          {message && !showOtpInput && (
            <div className="rounded-md p-4 bg-accent-success/10 border border-accent-success/20 text-accent-success">
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* OTP Input for mobile users */}
          {showOtpInput && magicLinkSent && (
            <div className="space-y-4">
              <div className="rounded-md p-4 bg-accent-secondary/10 border border-accent-secondary/20">
                <p className="text-accent-secondary text-sm font-medium mb-1">Check your email</p>
                <p className="text-secondary text-xs">
                  We sent an 8-digit code to <span className="font-medium text-primary">{email}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Verification Code
                </label>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setOtpCode(value);
                    if (otpError) setOtpError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpCode.length >= 8) {
                      e.preventDefault();
                      handleVerifyOtp();
                    }
                  }}
                  placeholder="Enter code"
                  className="text-center text-2xl tracking-[0.3em] font-mono"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                />
              </div>
              
              {otpError && (
                <div className="rounded-md p-3 bg-accent-error/10 border border-accent-error/20 text-accent-error">
                  <p className="text-sm">{otpError}</p>
                </div>
              )}
              
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length < 8}
                loading={verifyingOtp}
                className="w-full"
                size="lg"
              >
                Verify Code
              </Button>
              
              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode("");
                    setOtpError(null);
                    handleMagicLink({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  disabled={loading}
                  className="text-sm text-muted hover:text-secondary transition-colors"
                >
                  Didn't receive it? Send new code
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setMagicLinkSent(false);
                    setOtpCode("");
                    setOtpError(null);
                    setMessage("");
                    setUseMagicLink(false);
                  }}
                  className="text-sm text-muted hover:text-secondary transition-colors"
                >
                  Use password instead
                </button>
              </div>
            </div>
          )}

          {!showOtpInput && (
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
            size="lg"
          >
            {useMagicLink ? "Send OTP Code" : (isSignup ? "Create Account" : "Sign In")}
          </Button>
          )}


          {!showOtpInput && (
          <div className="text-center space-y-3">
            {/* Password login toggle - only show when using magic link */}
            {useMagicLink ? (
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(false);
                  setError("");
                  setMessage("");
                    setMagicLinkSent(false);
                }}
                className="text-sm text-muted hover:text-secondary transition-colors"
              >
                Use password instead
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignup(!isSignup);
                    setError("");
                    setMessage("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-accent-secondary hover:text-accent-secondary/80"
                >
                  {isSignup ? "Already have an account?" : "Need an account?"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseMagicLink(true);
                    setIsSignup(false);
                    setError("");
                    setMessage("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  className="text-sm text-muted hover:text-secondary transition-colors"
                >
                  Use magic link instead
                </button>
              </div>
            )}
          </div>
          )}
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginContent />
    </Suspense>
  );
}
