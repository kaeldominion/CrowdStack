"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Button, Card, PageLoader, Logo, Input } from "@crowdstack/ui";
import { AlertCircle, Folder, Mail, User, Calendar, CheckCircle } from "lucide-react";

// Detect iOS Safari for OTP-first flow
const isIOSSafari = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // MSStream is a legacy IE/Edge property, safe to check
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
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
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin"); // Clear mode: signin or signup
  const submittingRef = useRef(false);
  
  // OTP verification state
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Profile completion state (shown after auth if basic profile is incomplete)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    surname: "",
    date_of_birth: "",
    gender: "" as "" | "male" | "female",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<any>(null);

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
      if (process.env.NODE_ENV === "development") {
        console.error("[Login] Password signup error:", err);
      }
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
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] No session in authData");
        }
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

      // Check for redirect param
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect");
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Redirect param:", redirect);
      }

      // Check if basic profile is complete (name, surname, DOB, gender)
      // Skip this check for admin/app/door routes (staff don't need attendee profile)
      const isStaffRoute = redirect?.startsWith("/app") ||
                           redirect?.startsWith("/door") ||
                           redirect?.startsWith("/admin");

      if (!isStaffRoute) {
        try {
          const profileResponse = await fetch("/api/user/profile");
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();

            if (!profileData.basicProfileComplete) {
              // Profile incomplete - show completion step
              if (process.env.NODE_ENV === "development") {
                console.log("[Login] Basic profile incomplete, showing completion step");
              }

              // Pre-fill with any existing data
              setProfileData({
                name: profileData.profile?.name || "",
                surname: profileData.profile?.surname || "",
                date_of_birth: profileData.profile?.date_of_birth || "",
                gender: profileData.profile?.gender || "",
              });

              // Store redirect for after profile completion
              setPendingRedirect(redirect || "/me");
              setAuthSession(authData);
              setShowProfileCompletion(true);
              setLoading(false);
              return;
            }
          }
        } catch (profileErr: any) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[Login] Error checking profile:", profileErr.message);
          }
          // Continue with redirect if profile check fails
        }
      }

      // Profile complete or staff route - proceed with redirect
      await proceedWithRedirect(session, redirect);
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("[Login] handleSuccessfulAuth error:", err);
      }
      setError("Authentication succeeded but redirect failed. Please go to /me manually.");
      setLoading(false);
    }
  };

  // Separate function for redirect logic (used after profile completion too)
  const proceedWithRedirect = async (session: any, redirect: string | null) => {
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

    // Check user profiles for redirect (priority: venue > organizer > promoter > dj > attendee)
    const supabase = createBrowserClient();
    const user = session.user;

    if (user && !redirect) {
      try {
        // First check for special roles (superadmin, door_staff)
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roleNames = roles?.map((r: any) => r.role) || [];

        if (roleNames.includes("superadmin")) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting superadmin to /admin");
          }
          window.location.href = "/admin";
          return;
        } else if (roleNames.includes("door_staff")) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting door_staff to /door");
          }
          window.location.href = "/door";
          return;
        }

        // Check profiles in priority order: venue > organizer > promoter > dj
        // 1. Check for venue profile
        const { data: venueAccess } = await supabase
          .from("venue_users")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (venueAccess && venueAccess.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting venue user to /app/venue");
          }
          window.location.href = "/app/venue";
          return;
        }

        // 2. Check for organizer profile
        const { data: organizerAccess } = await supabase
          .from("organizer_users")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (organizerAccess && organizerAccess.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting organizer user to /app/organizer");
          }
          window.location.href = "/app/organizer";
          return;
        }

        // 3. Check for promoter profile
        const { data: promoterProfile } = await supabase
          .from("promoters")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (promoterProfile && promoterProfile.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting promoter to /app/promoter");
          }
          window.location.href = "/app/promoter";
          return;
        }

        // 4. Check for DJ profile
        const { data: djProfile } = await supabase
          .from("djs")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (djProfile && djProfile.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Login] Redirecting DJ to /app/dj");
          }
          window.location.href = "/app/dj";
          return;
        }
      } catch (profileErr: any) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Login] Error checking profiles:", profileErr.message);
        }
      }
    }

    // Default: attendee goes to /me
    const finalRedirect = redirect || "/me";
    if (process.env.NODE_ENV === "development") {
      console.log("[Login] Redirecting to:", finalRedirect);
    }
    window.location.href = finalRedirect;
  };

  // Handle saving profile and continuing with redirect
  const handleSaveProfile = async () => {
    // Validate
    const errors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      errors.name = "First name is required";
    } else if (profileData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!profileData.surname.trim()) {
      errors.surname = "Last name is required";
    } else if (profileData.surname.trim().length < 2) {
      errors.surname = "Last name must be at least 2 characters";
    }

    if (!profileData.date_of_birth) {
      errors.date_of_birth = "Date of birth is required";
    } else {
      const dob = new Date(profileData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        errors.date_of_birth = "You must be 18 or older";
      }
    }

    if (!profileData.gender) {
      errors.gender = "Please select your gender";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setSavingProfile(true);
    setProfileErrors({});

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Profile saved - proceed with redirect
      if (process.env.NODE_ENV === "development") {
        console.log("[Login] Profile saved, proceeding to redirect:", pendingRedirect);
      }

      if (authSession?.session) {
        await proceedWithRedirect(authSession.session, pendingRedirect);
      } else {
        window.location.href = pendingRedirect || "/me";
      }
    } catch (err: any) {
      setProfileErrors({ general: err.message || "Failed to save profile" });
      setSavingProfile(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use authMode to determine if this is signup
    if (authMode === "signup" || isSignup) {
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
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] Password login error:", signInError.message);
        }
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
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] No session in response");
        }
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
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] Session not accessible after login. Error:", sessionError);
        }
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
      
      // Check user profiles for automatic app redirect (priority: venue > organizer > promoter > dj > attendee)
      const user = data.user;
      if (user) {
        try {
          // First check for special roles (superadmin, door_staff)
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          if (rolesError) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[Login] Could not fetch user roles:", rolesError.message);
            }
          }
          
          const roleNames = roles?.map((r: any) => r.role) || [];
          
          if (roleNames.includes("superadmin")) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting superadmin to /admin");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/admin";
            return;
          } else if (roleNames.includes("door_staff")) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting door_staff to /door");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/door";
            return;
          }
          
          // Check profiles in priority order: venue > organizer > promoter > dj
          // 1. Check for venue profile
          const { data: venueAccess } = await supabase
            .from("venue_users")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (venueAccess && venueAccess.length > 0) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting venue user to /app/venue");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/app/venue";
            return;
          }
          
          // 2. Check for organizer profile
          const { data: organizerAccess } = await supabase
            .from("organizer_users")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (organizerAccess && organizerAccess.length > 0) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting organizer user to /app/organizer");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/app/organizer";
            return;
          }
          
          // 3. Check for promoter profile
          const { data: promoterProfile } = await supabase
            .from("promoters")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (promoterProfile && promoterProfile.length > 0) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting promoter to /app/promoter");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/app/promoter";
            return;
          }
          
          // 4. Check for DJ profile
          const { data: djProfile } = await supabase
            .from("djs")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (djProfile && djProfile.length > 0) {
            if (process.env.NODE_ENV === "development") {
              console.log("[Login] Redirecting DJ to /app/dj");
            }
            await new Promise(resolve => setTimeout(resolve, 300));
            window.location.href = "/app/dj";
            return;
          }
          
          // Default: attendee goes to /me (handled by final redirect below)
        } catch (profileErr: any) {
          // If profile check fails, continue to default redirect (/me)
          if (process.env.NODE_ENV === "development") {
            console.warn("[Login] Error checking user profiles, redirecting to default:", profileErr.message);
          }
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
      // signInWithOtp works for both sign in and sign up - it automatically creates accounts for new users
      // (if signup is enabled in Supabase settings)
      const { data, error: magicError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (magicError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Login] Magic link error:", magicError);
          console.error("[Login] Error code:", magicError.status);
          console.error("[Login] Error message:", magicError.message);
        }
        
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
      if (process.env.NODE_ENV === "development") {
        console.error("[Login] Magic link exception:", err);
      }
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
          // Supabase types don't include all OTP types, so we use a type assertion
          // Valid types: "email" | "signup" | "magiclink" | "sms" | "phone_change" | "email_change" | "recovery" | "invite"
          const verifyPromise = supabase.auth.verifyOtp({
            email,
            token: trimmedCode,
            type: type as "email" | "signup" | "magiclink",
          });
          
          const timeoutPromise = new Promise<{ error: Error }>((_, reject) => 
            setTimeout(() => reject(new Error("Verification timeout")), 10000)
          );
          
          const result = await Promise.race([verifyPromise, timeoutPromise]);
          
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
        if (process.env.NODE_ENV === "development") {
          console.error("[OTP Verify] All types failed. Last error:", verifyError.message);
        }
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
      if (process.env.NODE_ENV === "development") {
        console.error("[OTP Verify] Exception:", err);
      }
      setOtpError(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Profile completion UI - shown after auth if basic profile is incomplete
  if (showProfileCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Link href="/">
              <Logo variant="tricolor" size="lg" />
            </Link>
          </div>

          <div className="text-center mb-6">
            <div className="mx-auto w-14 h-14 bg-accent-secondary/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-accent-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-2">One More Step</h1>
            <p className="text-secondary text-sm">
              We need a few details to get you on guest lists
            </p>
          </div>

          {/* Progress indicator */}
          <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-accent-secondary" />
              <span className="text-accent-secondary font-medium">Account created</span>
            </div>
          </div>

          {/* Error message */}
          {profileErrors.general && (
            <div className="rounded-md p-3 bg-accent-error/10 border border-accent-error/20 text-accent-error mb-4">
              <p className="text-sm">{profileErrors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  First Name *
                </label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="John"
                  error={profileErrors.name}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Last Name *
                </label>
                <Input
                  value={profileData.surname}
                  onChange={(e) => setProfileData({ ...profileData, surname: e.target.value })}
                  placeholder="Smith"
                  error={profileErrors.surname}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Date of Birth *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="date"
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                  value={profileData.date_of_birth}
                  onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  min="1920-01-01"
                />
              </div>
              {profileErrors.date_of_birth && (
                <p className="mt-1 text-sm text-accent-error">{profileErrors.date_of_birth}</p>
              )}
              <p className="mt-1 text-xs text-muted">You must be at least 18 years old</p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Gender *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, gender: "male" })}
                  className={`py-3 rounded-lg border-2 font-medium transition-all active:scale-[0.98] ${
                    profileData.gender === "male"
                      ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                      : "bg-[var(--bg-raised)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-strong)]"
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, gender: "female" })}
                  className={`py-3 rounded-lg border-2 font-medium transition-all active:scale-[0.98] ${
                    profileData.gender === "female"
                      ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                      : "bg-[var(--bg-raised)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-strong)]"
                  }`}
                >
                  Female
                </button>
              </div>
              {profileErrors.gender && (
                <p className="mt-1 text-sm text-accent-error">{profileErrors.gender}</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            loading={savingProfile}
            className="w-full mt-6"
            size="lg"
          >
            Continue
          </Button>

          {/* Why we need this */}
          <p className="text-xs text-muted text-center mt-4">
            Venues need this info to check you in at the door
          </p>
        </Card>
      </div>
    );
  }

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
          {/* Tab selector for Sign In / Sign Up */}
          <div className="flex items-center justify-center gap-1 mb-6 bg-active/30 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setIsSignup(false);
                setError("");
                setMessage("");
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                authMode === "signin"
                  ? "bg-accent-secondary text-void shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setIsSignup(true);
                setError("");
                setMessage("");
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                authMode === "signup"
                  ? "bg-accent-secondary text-void shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Sign Up
            </button>
          </div>

          <h1 className="text-2xl font-bold text-primary">
            {authMode === "signup" ? "Create Your Account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {authMode === "signup"
              ? "Create an account to get started. You can use email + password or magic link."
              : "Sign in to your account. You can use email + password or magic link."}
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
                  placeholder={(authMode === "signup" || isSignup) ? "Create a password (min 6 characters)" : "Enter your password"}
                  minLength={(authMode === "signup" || isSignup) ? 6 : undefined}
                />
              </div>
              {(authMode === "signup" || isSignup) && (
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
              {authMode === "signin" && !isSignup && (
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
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-accent-secondary" />
                  </div>
                  <div className="text-left">
                    <p className="text-accent-secondary text-sm font-medium mb-1">Check your email</p>
                    <p className="text-secondary text-xs">
                      We sent an 8-digit code to <span className="font-medium text-primary">{email}</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* OTP Help Notice */}
              <div className="rounded-md p-4 bg-accent-warning/10 border-2 border-accent-warning/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-accent-warning" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-accent-warning text-sm font-semibold">
                      Can't find your code?
                    </p>
                    <div className="flex items-start gap-2">
                      <Folder className="h-4 w-4 text-accent-secondary mt-0.5 flex-shrink-0" />
                      <p className="text-secondary text-xs leading-relaxed">
                        Check your <strong className="text-primary">junk or spam folder</strong> - verification emails often end up there, especially for first-time users.
                      </p>
                    </div>
                    <Link 
                      href="/faq" 
                      className="text-xs text-accent-secondary hover:text-accent-primary underline inline-flex items-center gap-1"
                    >
                      Need more help? Visit our FAQ →
                    </Link>
                  </div>
                </div>
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
                    // Keep the same auth mode (signin/signup)
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
            {useMagicLink 
              ? (authMode === "signup" ? "Send Sign Up Code" : "Send Sign In Code")
              : (authMode === "signup" ? "Create Account" : "Sign In")}
          </Button>
          )}


          {!showOtpInput && (
          <div className="text-center space-y-3 pt-2 border-t border-border-subtle">
            {/* Toggle between magic link and password */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(!useMagicLink);
                  setError("");
                  setMessage("");
                  setMagicLinkSent(false);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-sm text-muted hover:text-secondary transition-colors"
              >
                {useMagicLink 
                  ? "Use password instead" 
                  : "Use magic link instead"}
              </button>
            </div>
            
            {/* Helpful note for new users */}
            {authMode === "signup" && useMagicLink && (
              <p className="text-xs text-secondary mt-2">
                ✨ Magic link works for both new and existing accounts
              </p>
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
