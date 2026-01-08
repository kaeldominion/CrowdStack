"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, Logo, InlineSpinner } from "@crowdstack/ui";
import { Calendar, Instagram, MessageCircle, User, ArrowRight, Check, Mail, MapPin, Users, ChevronDown, Settings, LogOut, AlertCircle, Folder, HelpCircle } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface TypeformSignupProps {
  onSubmit: (data: SignupData) => Promise<void>;
  isLoading?: boolean;
  redirectUrl?: string; // URL to redirect to after magic link
  onEmailVerified?: () => Promise<boolean>; // Callback when email is verified, return true if already registered
  eventSlug?: string; // Event slug for checking registration
  existingProfile?: { // Existing profile data to pre-fill and skip fields
    name?: string | null;
    surname?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null;
  registrationCount?: number; // Number of previous registrations for progressive signup
  forcePasswordFallback?: boolean; // If true, show password fallback immediately
  fallbackReason?: "pkce" | "expired" | "failed" | "rate_limit"; // Reason for password fallback
  eventName?: string; // Event name to display throughout registration
  eventDetails?: {
    venueName?: string | null;
    startTime?: string | null;
    registrationCount?: number;
    flierUrl?: string | null;
  };
}

export interface SignupData {
  email: string;
  name: string;
  surname: string;
  date_of_birth: string;
  gender: "male" | "female";
  whatsapp: string;
  instagram_handle: string;
}

type StepId = "email" | "name" | "surname" | "date_of_birth" | "gender" | "whatsapp" | "instagram_handle";

const steps: Array<{ id: StepId; label: string; mobileLabel?: string }> = [
  { id: "email", label: "What's your email?", mobileLabel: "What's your email?" },
  { id: "name", label: "What's your first name?", mobileLabel: "First name?" },
  { id: "surname", label: "And your last name?", mobileLabel: "Last name?" },
  { id: "date_of_birth", label: "When were you born?", mobileLabel: "Date of birth?" },
  { id: "gender", label: "What's your gender?", mobileLabel: "Gender?" },
  { id: "whatsapp", label: "What's your WhatsApp number?", mobileLabel: "WhatsApp number?" },
  { id: "instagram_handle", label: "What's your Instagram handle?", mobileLabel: "Instagram handle?" },
];

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

export function TypeformSignup({ onSubmit, isLoading = false, redirectUrl, onEmailVerified, eventSlug, existingProfile, registrationCount = 0, forcePasswordFallback = false, fallbackReason, eventName, eventDetails }: TypeformSignupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(forcePasswordFallback);
  const [passwordFallbackFromMagicLink, setPasswordFallbackFromMagicLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // OTP verification state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [formData, setFormData] = useState<SignupData>({
    email: "",
    name: existingProfile?.name || "",
    surname: existingProfile?.surname || "",
    date_of_birth: existingProfile?.date_of_birth || "",
    gender: (existingProfile as any)?.gender || "male",
    whatsapp: existingProfile?.whatsapp || "",
    instagram_handle: existingProfile?.instagram_handle || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});
  const [skippedWhatsapp, setSkippedWhatsapp] = useState(false); // Track if user skipped WhatsApp on 3rd+ registration
  const autoSubmittedRef = useRef(false); // Track if we've already auto-submitted
  const [fetchedProfile, setFetchedProfile] = useState<typeof existingProfile>(null); // Profile fetched after email verification
  const [fetchedRegistrationCount, setFetchedRegistrationCount] = useState<number | null>(null); // Registration count fetched after email verification
  const hasFetchedProfile = useRef(false); // Track if we've fetched profile after email verification
  
  // Merge prop profile with fetched profile (fetched takes precedence if available)
  const mergedProfile = fetchedProfile || existingProfile;
  const mergedRegistrationCount = fetchedRegistrationCount !== null ? fetchedRegistrationCount : registrationCount;
  
  // Navigation auth state
  const router = useRouter();
  const [navUser, setNavUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [navLoading, setNavLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll form into view when keyboard opens (for mobile)
  const scrollFormIntoView = () => {
    if (formContainerRef.current && typeof window !== "undefined" && window.innerWidth < 640) {
      setTimeout(() => {
        formContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  // Fetch profile data after email verification (always fetch to ensure we have latest data)
  useEffect(() => {
    if (emailVerified && !hasFetchedProfile.current) {
      hasFetchedProfile.current = true;
      const fetchProfile = async () => {
        try {
          const response = await fetch("/api/profile");
          if (response.ok) {
            const profileData = await response.json();
            const attendee = profileData.attendee;
            
            if (attendee) {
              setFetchedProfile({
                name: attendee.name,
                surname: attendee.surname,
                date_of_birth: attendee.date_of_birth,
                gender: attendee.gender || null,
                whatsapp: attendee.whatsapp,
                instagram_handle: attendee.instagram_handle,
              });
            }
            
            // Update registration count if available
            if (profileData.registrationCount !== undefined) {
              setFetchedRegistrationCount(profileData.registrationCount);
            }
          }
        } catch (err) {
          console.error("[TypeformSignup] Error fetching profile after email verification:", err);
          // Reset flag on error so we can retry if needed
          hasFetchedProfile.current = false;
        }
      };
      
      fetchProfile();
    }
  }, [emailVerified]);

  // Progressive signup logic based on registration count
  // First registration (0): name, surname, gender, instagram_handle
  // Second registration (1): instagram_handle if missing
  // Third+ registration (2+): whatsapp if missing (skippable)
  const requiredProfileSteps = useMemo(() => {
    const visible: StepId[] = [];
    
    // Helper to check if a value is valid (not empty, null, undefined, or whitespace-only)
    const hasValue = (val: string | null | undefined): boolean => {
      return !!(val && val.trim().length > 0);
    };
    
    if (mergedRegistrationCount === 0) {
      // First registration: only ask for name, surname, gender, instagram
      if (!hasValue(mergedProfile?.name)) visible.push("name");
      if (!hasValue(mergedProfile?.surname)) visible.push("surname");
      if (!(mergedProfile as any)?.gender) visible.push("gender");
      if (!hasValue(mergedProfile?.instagram_handle)) visible.push("instagram_handle");
      // NOTE: date_of_birth and whatsapp are NOT asked on first registration
    } else if (mergedRegistrationCount === 1) {
      // Second registration: only ask for instagram if missing
      if (!hasValue(mergedProfile?.instagram_handle)) visible.push("instagram_handle");
    } else if (mergedRegistrationCount >= 2) {
      // Third+ registration: ask for whatsapp if missing (will be skippable)
      if (!hasValue(mergedProfile?.whatsapp)) visible.push("whatsapp");
    }
    
    return visible;
  }, [mergedProfile, mergedRegistrationCount]);

  // Determine which steps to show - email step + required profile steps
  const visibleSteps = useMemo(() => {
    const visible: StepId[] = [];
    
    // Always show email step if not verified
    if (!emailVerified) {
      visible.push("email");
    }
    
    // Add the required profile steps (stable, won't change as user types)
    visible.push(...requiredProfileSteps);
    
    return visible;
  }, [emailVerified, requiredProfileSteps]);

  // Detect mobile/iOS on mount
  useEffect(() => {
    setIsMobileDevice(isIOSSafari());
  }, []);

  // Load nav user on mount
  useEffect(() => {
    const loadNavUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: attendee } = await supabase
            .from("attendees")
            .select("name")
            .eq("user_id", authUser.id)
            .single();

          setNavUser({
            id: authUser.id,
            email: authUser.email || "",
            name: attendee?.name || authUser.user_metadata?.name,
          });
        }
      } catch (error) {
        console.error("Error loading nav user:", error);
      } finally {
        setNavLoading(false);
      }
    };
    loadNavUser();
  }, []);

  // Click outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setIsProfileOpen(false);
    router.push("/");
  };

  const getNavUserInitial = () => {
    if (navUser?.name) return navUser.name[0].toUpperCase();
    if (navUser?.email) return navUser.email[0].toUpperCase();
    return "U";
  };

  const getNavDisplayName = () => {
    if (navUser?.name) return navUser.name;
    if (navUser?.email) return navUser.email.split("@")[0];
    return "User";
  };

  // Check if user is already authenticated and update formData with email
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email! }));
        setEmailVerified(true);
      }
    };
    checkAuth();
  }, []);

  // If forcePasswordFallback is true or showPasswordFallback is true, restore email from sessionStorage
  useEffect(() => {
    if ((forcePasswordFallback || showPasswordFallback) && !formData.email && typeof window !== "undefined") {
      // Try to restore email from sessionStorage (stored when magic link was sent)
      const storedEmail = sessionStorage.getItem("pending_registration_email");
      if (storedEmail) {
        setFormData(prev => ({ ...prev, email: storedEmail }));
      }
    }
  }, [forcePasswordFallback, showPasswordFallback, formData.email]);

  // Update formData when existingProfile changes
  useEffect(() => {
    if (mergedProfile) {
      // Helper to get a valid trimmed value or empty string
      const getValue = (existing: string | null | undefined, current: string): string => {
        // If current has a value, keep it
        if (current && current.trim()) return current;
        // Otherwise use existing if valid
        if (existing && existing.trim()) return existing.trim();
        return "";
      };

      setFormData(prev => ({
        ...prev,
        name: getValue(mergedProfile.name, prev.name),
        surname: getValue(mergedProfile.surname, prev.surname),
        date_of_birth: getValue(mergedProfile.date_of_birth, prev.date_of_birth),
        gender: prev.gender || (mergedProfile as any)?.gender || "male",
        whatsapp: getValue(mergedProfile.whatsapp, prev.whatsapp),
        instagram_handle: getValue(mergedProfile.instagram_handle, prev.instagram_handle),
      }));
    }
  }, [mergedProfile]);

  // Auto-submit if all fields are already filled (no steps needed)
  useEffect(() => {
    if (emailVerified && visibleSteps.length === 0 && !isLoading && !autoSubmittedRef.current) {
      // All required fields are already filled, auto-submit
      autoSubmittedRef.current = true;
      const autoSubmit = async () => {
        try {
          const supabase = createBrowserClient();
          const { data: { user } } = await supabase.auth.getUser();
          const email = user?.email || formData.email;
          
          if (!email) {
            autoSubmittedRef.current = false; // Reset if email missing
            return;
          }
          
          const mergedData: SignupData = {
            email: email,
            name: formData.name || mergedProfile?.name || "",
            surname: formData.surname || mergedProfile?.surname || "",
            date_of_birth: formData.date_of_birth || mergedProfile?.date_of_birth || "",
            gender: formData.gender || (mergedProfile as any)?.gender || "male",
            whatsapp: formData.whatsapp || mergedProfile?.whatsapp || "",
            instagram_handle: formData.instagram_handle || mergedProfile?.instagram_handle || "",
          };
          
          await onSubmit(mergedData);
        } catch (error) {
          console.error("[TypeformSignup] Auto-submit error:", error);
          autoSubmittedRef.current = false; // Reset on error so it can retry
          // If auto-submit fails, show error but don't break the UI
        }
      };
      
      autoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailVerified, visibleSteps.length, isLoading]);

  // Reset current step when visible steps change (e.g., when email is verified)
  useEffect(() => {
    if (visibleSteps.length > 0) {
      // If email was just verified and it was the first step, move to next step
      if (emailVerified && visibleSteps[0] === "email" && currentStep === 0) {
        setCurrentStep(1);
      } else if (emailVerified && visibleSteps[0] !== "email") {
        // Email is verified and not in visible steps, start at step 0
        setCurrentStep(0);
      }
    }
  }, [emailVerified, visibleSteps.length]);

  const validateStep = (step: number): boolean => {
    // Guard against empty visibleSteps or invalid step
    if (visibleSteps.length === 0 || step >= visibleSteps.length) return false;
    
    const stepKey = visibleSteps[step] as keyof SignupData;
    const value = formData[stepKey];

    // Check for skippable WhatsApp first (before general empty check)
    if (stepKey === "whatsapp" && mergedRegistrationCount >= 2) {
      // WhatsApp is skippable on 3rd+ registration, so allow empty
      if (!value || !value.trim()) {
        // Empty is allowed when skippable - validation passes
        return true;
      }
      // If value is provided, validate format
      if (value && value.trim()) {
        const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
        if (!whatsappRegex.test(value.replace(/\s/g, ""))) {
          setErrors({ [stepKey]: "Please enter a valid WhatsApp number (e.g., +1234567890)" });
          return false;
        }
      }
      return true; // WhatsApp validation passed
    }

    // General empty check for all other fields
    if (!value || !value.trim()) {
      setErrors({ [stepKey]: "This field is required" });
      return false;
    }

    // Specific validations
    if (stepKey === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors({ [stepKey]: "Please enter a valid email address" });
        return false;
      }
    }

    if (stepKey === "date_of_birth") {
      const date = new Date(value);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        setErrors({ [stepKey]: "Please enter a valid date of birth" });
        return false;
      }
      const today = new Date();
      // Calculate age more accurately
      let age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      if (age < 13) {
        setErrors({ [stepKey]: "You must be at least 13 years old" });
        return false;
      }
      if (age > 120) {
        setErrors({ [stepKey]: "Please enter a valid date of birth" });
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleSendMagicLink = async () => {
    if (!validateStep(0)) return; // Validate email step

    setSendingMagicLink(true);
    setErrors({});

    try {
      // Use the API route which properly handles redirect URLs with current origin
      const currentUrl = redirectUrl || window.location.href;
      
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          redirect: currentUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to send magic link";
        const errorMsgLower = errorMsg.toLowerCase();
        
        // Check if it's a rate limit error or PKCE/browser error
        // Even if there's an error, still show the magic link screen with a warning
        // so users can manually choose to use password instead
        if (errorMsgLower.includes("rate limit") || 
            errorMsgLower.includes("too many") ||
            errorMsgLower.includes("email rate limit") ||
            errorMsgLower.includes("same browser") ||
            errorMsgLower.includes("pkce") ||
            errorMsgLower.includes("verifier")) {
          // Store the error message but still show the magic link screen
          setMagicLinkError(errorMsg);
          setMagicLinkSent(true);
          // Store email in sessionStorage in case magic link fails and we need password fallback
          if (typeof window !== "undefined" && formData.email) {
            sessionStorage.setItem("pending_registration_email", formData.email);
          }
          return;
        }
        throw new Error(errorMsg);
      }

      setMagicLinkSent(true);
      setMagicLinkError(null); // Clear any previous errors
      // Store email in sessionStorage in case magic link fails and we need password fallback
      if (typeof window !== "undefined" && formData.email) {
        sessionStorage.setItem("pending_registration_email", formData.email);
      }
    } catch (err: any) {
      setErrors({ email: err.message || "Failed to send magic link" });
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handlePasswordSignup = async () => {
    // Ensure email is present
    if (!formData.email || !formData.email.trim()) {
      setErrors({ email: "Email is required. Please enter your email address." });
      return;
    }

    if (password.length < 6) {
      setErrors({ email: "Password must be at least 6 characters" });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ email: "Passwords do not match" });
      return;
    }

    setSendingMagicLink(true);
    setErrors({});

    try {
      // Use API endpoint to create account (bypasses email confirmation and rate limits)
      const response = await fetch("/api/auth/password-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // If user already exists, try to sign in directly
      if (data.userExists) {
        console.log("[Password Signup] User already exists, attempting sign in...");
        const supabase = createBrowserClient();
        
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password,
        });

        if (signInErr || !signInData.session) {
          // If sign in fails, the password might be wrong or account might need password reset
          throw new Error(signInErr?.message || "Failed to sign in. If you forgot your password, please use the password reset option.");
        }

        // Successfully signed in with existing account
        setEmailVerified(true);
        setShowPasswordFallback(false);
        setPasswordFallbackFromMagicLink(false);
        
        if (onEmailVerified) {
          const alreadyRegistered = await onEmailVerified();
          if (alreadyRegistered) {
            return;
          }
        }
        
        // Don't manually set currentStep here - let the useEffect handle it
        // after visibleSteps recalculates without the email step
        return;
      }

      // Account created - now sign in with password
      // Add a delay to ensure user is fully created and password is set
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const supabase = createBrowserClient();
      
      // Try to sign in with password (retry up to 5 times with increasing delays)
      let signInSuccess = false;
      let signInError = null;
      
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          // Wait longer between retries (1s, 2s, 3s, 4s)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password,
        });

        if (!signInErr && signInData.session) {
          signInSuccess = true;
          break;
        }
        
        signInError = signInErr;
        
        // If it's an invalid credentials error, the password might not be set yet, keep retrying
        // If it's a different error, break early
        if (signInErr && !signInErr.message.includes("Invalid login credentials") && !signInErr.message.includes("Email not confirmed")) {
          break;
        }
      }

      if (!signInSuccess) {
        console.error("Failed to sign in after account creation:", signInError);
        // If account was created but sign in failed, provide helpful error
        if (data.user && data.user.id) {
          throw new Error(`Account created but sign in failed. Please try logging in manually at /login with your email and password. Error: ${signInError?.message || "Unknown error"}`);
        } else {
          throw new Error(`Failed to sign in: ${signInError?.message || "Unknown error"}. Please try again.`);
        }
      }

      // Successfully signed in
      setEmailVerified(true);
      setShowPasswordFallback(false);
      setPasswordFallbackFromMagicLink(false);
      
      // Clear stored email from sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pending_registration_email");
      }
      
      // Check if already registered (if callback provided)
      if (onEmailVerified) {
        const alreadyRegistered = await onEmailVerified();
        if (alreadyRegistered) {
          return; // Parent component will handle showing success
        }
      }
      
      // Don't manually set currentStep here - let the useEffect handle it
      // after visibleSteps recalculates without the email step
    } catch (err: any) {
      setErrors({ email: err.message || "Failed to create account" });
    } finally {
      setSendingMagicLink(false);
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
      const supabase = createBrowserClient();
      const trimmedCode = otpCode.trim();
      
      console.log("[OTP Verify] Attempting verification for:", formData.email, "with code length:", trimmedCode.length);
      
      // Try all possible OTP types in order
      const typesToTry = ["email", "signup", "magiclink"];
      let data = null;
      let verifyError = null;
      
      for (const type of typesToTry) {
        console.log(`[OTP Verify] Trying type: ${type}`);
        // Supabase types don't include all OTP types, so we use a type assertion
        // Valid types: "email" | "signup" | "magiclink" | "sms" | "phone_change" | "email_change" | "recovery" | "invite"
        const result = await supabase.auth.verifyOtp({
          email: formData.email,
          token: trimmedCode,
          type: type as "email" | "signup" | "magiclink",
        });
        
        if (!result.error && result.data?.session) {
          console.log(`[OTP Verify] Success with type: ${type}`);
          data = result.data;
          verifyError = null;
          break;
        } else if (result.error) {
          console.log(`[OTP Verify] Failed with type ${type}:`, result.error.message);
          verifyError = result.error;
          // Continue to next type unless it's a clear non-retryable error
          if (result.error.message.includes("User not found") || 
              result.error.message.includes("Email rate limit")) {
            break; // Don't retry for these errors
          }
        }
      }

      if (verifyError) {
        console.error("[OTP Verify] All types failed. Last error:", verifyError.message, verifyError);
        if (verifyError.message.includes("expired") || verifyError.message.includes("Token has expired") || verifyError.message.includes("has expired")) {
          setOtpError("Code expired. The code is only valid for 60 seconds. Please request a new code.");
        } else if (verifyError.message.includes("invalid") || verifyError.message.includes("Token") || verifyError.message.includes("Invalid")) {
          setOtpError("Invalid code. Please check the 8-digit code from your email and try again.");
        } else if (verifyError.message.includes("User not found")) {
          setOtpError("User not found. Please request a new code.");
        } else {
          setOtpError(`Verification failed: ${verifyError.message}. Please try requesting a new code.`);
        }
        return;
      }

      if (!data || !data.session) {
        setOtpError("Verification failed. Please try again.");
        return;
      }

      // Successfully verified!
      console.log("[OTP Verify] Success for:", formData.email);
      setEmailVerified(true);
      setMagicLinkSent(false);
      setShowOtpInput(false);
      
      // Clear stored email from sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pending_registration_email");
      }
      
      // Check if already registered (if callback provided)
      if (onEmailVerified) {
        const alreadyRegistered = await onEmailVerified();
        if (alreadyRegistered) {
          return; // Parent component will handle showing success
        }
      }
      
      // Don't manually set currentStep here - let the useEffect handle it
      // after visibleSteps recalculates without the email step
    } catch (err: any) {
      console.error("[OTP Verify] Exception:", err);
      setOtpError(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSkipWhatsapp = async () => {
    if (visibleSteps.length === 0 || currentStep >= visibleSteps.length) return;
    if (mergedRegistrationCount >= 2 && visibleSteps[currentStep] === "whatsapp") {
      setSkippedWhatsapp(true);
      setErrors({}); // Clear any errors first
      // Clear whatsapp value - use functional update to ensure it's cleared
      setFormData(prev => ({ ...prev, whatsapp: "" }));
      
      // Move to next step or submit
      // Use setTimeout to ensure state updates are applied before validation
      setTimeout(async () => {
        if (currentStep < visibleSteps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          await handleSubmit();
        }
      }, 0);
    }
  };

  const handleNext = async () => {
    // Guard against empty visibleSteps
    if (visibleSteps.length === 0 || currentStep >= visibleSteps.length) return;
    
    // Special handling for email step
    if (visibleSteps[currentStep] === "email" && !emailVerified) {
      await handleSendMagicLink();
      return;
    }

    const stepKey = visibleSteps[currentStep];
    if (validateStep(currentStep)) {
      if (currentStep < visibleSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        await handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    // Validate the current step first
    const isValid = validateStep(currentStep);
    if (!isValid) {
      // Validation failed - error is already set by validateStep
      return;
    }
    
    try {
      // Get email from authenticated user if not in formData
      let email = formData.email;
      if (!email) {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        email = user?.email || "";
      }
      
      // Merge existing profile data with form data to ensure all fields are included
      const mergedData: SignupData = {
        email: email,
        name: formData.name || existingProfile?.name || "",
        surname: formData.surname || existingProfile?.surname || "",
        date_of_birth: formData.date_of_birth || existingProfile?.date_of_birth || "",
        gender: formData.gender || (existingProfile as any)?.gender || "male",
        whatsapp: formData.whatsapp || existingProfile?.whatsapp || "",
        instagram_handle: formData.instagram_handle || existingProfile?.instagram_handle || "",
      };
      
      // Progressive validation based on registration count
      // First registration (0): email, name, surname, gender, instagram (NO date_of_birth, NO whatsapp)
      // Second registration (1): instagram if missing
      // Third+ registration (2+): whatsapp is optional (can be skipped)
      const missingFields = [];
      if (!mergedData.email) missingFields.push("email");
      
      if (mergedRegistrationCount === 0) {
        // First registration requirements
        if (!mergedData.name) missingFields.push("name");
        if (!mergedData.surname) missingFields.push("surname");
        if (!mergedData.gender) missingFields.push("gender");
        if (!mergedData.instagram_handle) missingFields.push("instagram handle");
        // NOTE: date_of_birth and whatsapp are NOT required on first registration
      } else if (mergedRegistrationCount === 1) {
        // Second registration: only instagram if missing (should already have name, surname, gender from first registration)
        if (!mergedData.instagram_handle) missingFields.push("instagram handle");
        // Validate basic fields exist (they should from first registration, but check for safety)
        if (!mergedData.name) missingFields.push("name");
        if (!mergedData.surname) missingFields.push("surname");
        if (!mergedData.gender) missingFields.push("gender");
      } else if (mergedRegistrationCount >= 2) {
        // Third+ registration: whatsapp is optional (skippable)
        // All other fields should be present from previous registrations
        if (!mergedData.name) missingFields.push("name");
        if (!mergedData.surname) missingFields.push("surname");
        if (!mergedData.gender) missingFields.push("gender");
        if (!mergedData.instagram_handle) missingFields.push("instagram handle");
        // whatsapp is NOT required - can be empty when skipped
      }
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }
      
      console.log("Submitting form data:", mergedData);
      await onSubmit(mergedData);
    } catch (error: any) {
      // Handle errors from onSubmit - set error state
      const errorMessage = error?.message || "Failed to submit form";
      const stepKey = visibleSteps[currentStep] as keyof SignupData;
      setErrors({ [stepKey]: errorMessage });
      console.error("Form submission error:", error);
      // Re-throw so the parent can handle it
      throw error;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const getInputComponent = () => {
    // Guard against empty visibleSteps
    if (visibleSteps.length === 0 || currentStep >= visibleSteps.length) {
      return null;
    }
    
    const stepKey = visibleSteps[currentStep] as keyof SignupData;
    const value = formData[stepKey];
    const error = errors[stepKey];

    // Email step with magic link
    if (stepKey === "email") {
      // Show password fallback if rate limited or magic link failed
      if (showPasswordFallback) {
        return (
          <div className="space-y-4">
            {passwordFallbackFromMagicLink ? (
              <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-xl p-4 mb-4">
                <p className="text-accent-secondary text-sm text-center mb-2">
                  Magic link not working? Use a password instead.
                </p>
                <p className="text-secondary text-xs text-center">
                  If you already have an account, use your existing password to sign in.
                </p>
              </div>
            ) : fallbackReason === "pkce" ? (
              <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-xl p-4 mb-4">
                <p className="text-accent-secondary text-sm text-center mb-2">
                  📱 Magic link opened in a different browser
                </p>
                <p className="text-secondary text-xs text-center mb-2">
                  This often happens on iOS when email apps open links in their own browser.
                </p>
                <p className="text-secondary text-xs text-center">
                  Create a password below to continue, or go back and enter the 6-digit code from the email.
                </p>
              </div>
            ) : fallbackReason === "expired" ? (
              <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-xl p-4 mb-4">
                <p className="text-accent-warning text-sm text-center mb-2">
                  This magic link has expired or was already used.
                </p>
                <p className="text-secondary text-xs text-center">
                  Create a password below to continue, or request a new magic link.
                </p>
              </div>
            ) : fallbackReason === "rate_limit" ? (
              <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-xl p-4 mb-4">
                <p className="text-accent-warning text-sm text-center mb-2">
                  Email rate limit reached. Please set a password to continue.
                </p>
                <p className="text-secondary text-xs text-center">
                  If you already have an account, use your existing password to sign in.
                </p>
              </div>
            ) : (
              <div className="bg-accent-secondary/10 border border-accent-secondary/20 rounded-xl p-4 mb-4">
                <p className="text-accent-secondary text-sm text-center mb-2">
                  Let's set up your account with a password.
                </p>
                <p className="text-secondary text-xs text-center">
                  If you already have an account, use your existing password to sign in.
                </p>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="your@email.com"
                className="text-lg sm:text-xl py-4 sm:py-6 pl-14 text-center border-2 focus:border-accent-primary w-full"
                autoComplete="email"
                inputMode="email"
              />
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.length >= 6 && confirmPassword.length >= 6 && formData.email) {
                  e.preventDefault();
                  handlePasswordSignup();
                }
              }}
              placeholder="Password (min 6 characters)"
              className="text-lg sm:text-xl py-4 sm:py-6 text-center border-2 focus:border-accent-primary w-full"
              autoFocus
              autoComplete="new-password"
              minLength={6}
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.length >= 6 && confirmPassword.length >= 6 && formData.email) {
                  e.preventDefault();
                  handlePasswordSignup();
                }
              }}
              placeholder="Confirm password"
              className="text-lg sm:text-xl py-4 sm:py-6 text-center border-2 focus:border-accent-primary w-full"
              autoComplete="new-password"
              minLength={6}
            />
            <p className="text-xs text-secondary text-center px-4">
              Your account will be created and you can continue registration
            </p>
          </div>
        );
      }

      if (magicLinkSent && !emailVerified) {
        // OTP-only flow - always show code entry (no magic link click option)
        return (
          <div className="space-y-5">
            {/* Email Icon & Confirmation */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-accent-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6 text-accent-secondary" />
              </div>
              <div className="text-left">
                <p className="text-secondary text-sm">
                  We sent a code to <span className="font-medium text-primary">{formData.email}</span>
                </p>
                <p className="text-muted text-xs">
                  Check your email and enter the code below
                </p>
              </div>
            </div>
              
            {magicLinkError && (
              <div className="bg-accent-warning/10 border border-accent-warning/20 rounded-xl p-3">
                <p className="text-accent-warning text-xs text-center">
                  {magicLinkError.includes("rate limit") || magicLinkError.includes("too many")
                    ? "Email rate limit reached. Please wait a moment before trying again."
                    : "There was an issue. Please try again or use password."}
                </p>
              </div>
            )}
              
            {/* OTP Help Notice */}
            <div className="bg-accent-warning/10 border-2 border-accent-warning/30 rounded-xl p-4">
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
              
            {/* OTP Input */}
            <div className="space-y-4">
              <Input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  // Only allow digits and limit to 6 characters
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
                className="text-xl py-6 text-center tracking-[0.3em] font-mono border-2 focus:border-accent-primary w-full"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
              />
              
              {otpError && (
                <p className="text-accent-error text-sm text-center">{otpError}</p>
              )}
              
              <Button
                variant="primary"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.length < 8}
                loading={verifyingOtp}
                className="w-full"
              >
                {verifyingOtp ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
              
            {/* Action Links */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOtpCode("");
                  setOtpError(null);
                  handleSendMagicLink();
                }}
                disabled={sendingMagicLink}
                className="text-sm text-muted hover:text-secondary transition-colors w-full text-center"
              >
                {sendingMagicLink ? "Sending..." : "Didn't receive it? Send new code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && formData.email) {
                    sessionStorage.setItem("pending_registration_email", formData.email);
                  }
                  setPasswordFallbackFromMagicLink(true);
                  setShowPasswordFallback(true);
                  setMagicLinkSent(false);
                  setShowOtpInput(false);
                  setMagicLinkError(null);
                }}
                className="text-sm text-muted hover:text-secondary transition-colors w-full text-center"
              >
                Use password instead
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted" />
            <Input
              type="email"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (error) setErrors({ ...errors, email: undefined });
                setMagicLinkSent(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNext();
                }
              }}
              onFocus={scrollFormIntoView}
              placeholder="your@email.com"
              className="text-xl sm:text-2xl py-6 sm:py-8 pl-14 text-center border-2 focus:border-accent-primary w-full"
              autoFocus
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <p className="text-sm text-secondary text-center px-4">
            We'll send you an OTP code to verify your email
          </p>
        </div>
      );
    }

    switch (stepKey) {
      case "name":
        return (
          <div className="space-y-4">
            <Input
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (error) setErrors({ ...errors, name: undefined });
              }}
              onKeyDown={handleKeyDown}
              onFocus={scrollFormIntoView}
              placeholder="First name"
              className="text-xl sm:text-2xl py-6 sm:py-8 text-center border-2 focus:border-accent-primary w-full"
              autoFocus
              autoComplete="given-name"
            />
          </div>
        );

      case "surname":
        return (
          <div className="space-y-3 sm:space-y-4">
            <Input
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, surname: e.target.value });
                if (error) setErrors({ ...errors, surname: undefined });
              }}
              onKeyDown={handleKeyDown}
              onFocus={scrollFormIntoView}
              placeholder="Last name"
              className="text-lg sm:text-xl md:text-2xl py-4 sm:py-6 md:py-8 text-center border-2 focus:border-accent-primary w-full"
              autoFocus
              autoComplete="family-name"
            />
          </div>
        );

      case "date_of_birth":
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Calendar className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted pointer-events-none" />
              <Input
                type="date"
                value={value}
                onChange={(e) => {
                  setFormData({ ...formData, date_of_birth: e.target.value });
                  if (error) setErrors({ ...errors, date_of_birth: undefined });
                }}
                onKeyDown={handleKeyDown}
                className="text-base sm:text-lg md:text-xl py-4 sm:py-6 md:py-8 pl-12 sm:pl-14 pr-4 border-2 focus:border-accent-primary w-full [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                max={new Date().toISOString().split("T")[0]}
                min="1900-01-01"
              />
            </div>
            <p className="text-xs sm:text-sm text-secondary text-center px-4">
              You must be at least 13 years old
            </p>
          </div>
        );

      case "gender":
        return (
          <div className="space-y-4">
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, gender: "male" });
                  if (error) setErrors({ ...errors, gender: undefined });
                }}
                className={`flex-1 py-6 sm:py-8 rounded-xl border-2 transition-all ${
                  formData.gender === "male"
                    ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                    : "bg-active border-border-subtle text-secondary hover:border-border-strong"
                }`}
              >
                <span className="text-lg sm:text-xl font-semibold">Male</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, gender: "female" });
                  if (error) setErrors({ ...errors, gender: undefined });
                }}
                className={`flex-1 py-6 sm:py-8 rounded-xl border-2 transition-all ${
                  formData.gender === "female"
                    ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                    : "bg-active border-border-subtle text-secondary hover:border-border-strong"
                }`}
              >
                <span className="text-lg sm:text-xl font-semibold">Female</span>
              </button>
            </div>
          </div>
        );

      case "whatsapp":
        const isWhatsappSkippable = mergedRegistrationCount >= 2;
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <MessageCircle className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted" />
              <Input
                value={value}
                onChange={(e) => {
                  setFormData({ ...formData, whatsapp: e.target.value });
                  if (error) setErrors({ ...errors, whatsapp: undefined });
                }}
                onKeyDown={handleKeyDown}
                onFocus={scrollFormIntoView}
                placeholder="+1234567890"
                className="text-lg sm:text-xl md:text-2xl py-4 sm:py-6 md:py-8 pl-12 sm:pl-14 text-center border-2 focus:border-accent-primary w-full"
                autoFocus
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <p className="text-xs sm:text-sm text-secondary text-center px-4">
              {isWhatsappSkippable 
                ? "We'll use this to send you event updates (optional)"
                : "We'll use this to send you event updates"}
            </p>
            {isWhatsappSkippable && (
              <button
                type="button"
                onClick={handleSkipWhatsapp}
                className="text-sm text-secondary hover:text-primary underline text-center w-full mt-2"
              >
                Skip for now
              </button>
            )}
          </div>
        );

      case "instagram_handle":
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Instagram className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted" />
              <Input
                value={value}
                onChange={(e) => {
                  // Remove @ if user adds it
                  const handle = e.target.value.replace("@", "");
                  setFormData({ ...formData, instagram_handle: handle });
                  if (error) setErrors({ ...errors, instagram_handle: undefined });
                }}
                onKeyDown={handleKeyDown}
                onFocus={scrollFormIntoView}
                placeholder="username"
                className="text-lg sm:text-xl md:text-2xl py-4 sm:py-6 md:py-8 pl-12 sm:pl-14 text-center border-2 focus:border-accent-primary w-full"
                autoFocus
                autoComplete="username"
              />
            </div>
            <p className="text-xs sm:text-sm text-secondary text-center px-4">We'll tag you in event photos</p>
          </div>
        );

      default:
        return null;
    }
  };

  const stepProgress = visibleSteps.length > 0
    ? ((currentStep + 1) / visibleSteps.length) * 100 
    : 100; // If no steps, show 100% (all done, auto-submitting)

  // Use mobile-optimized label on small screens
  const getLabel = () => {
    // If showing OTP input, display OTP title instead of email step title
    if (magicLinkSent && !emailVerified) {
      return "Enter verification code";
    }
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const stepId = visibleSteps[currentStep];
    const step = steps.find(s => s.id === stepId);
    if (!step) return "";
    return isMobile && step.mobileLabel ? step.mobileLabel : step.label;
  };

  const flierUrl = eventDetails?.flierUrl;

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 overflow-y-auto overflow-x-hidden bg-void"
      style={{ 
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))",
        // Use 100dvh on mobile to account for dynamic viewport changes (keyboard)
        minHeight: typeof window !== "undefined" && window.innerWidth < 640 ? "100dvh" : "100vh",
      }}
    >
      {/* Blurred Flier Background */}
      {flierUrl ? (
        <div className="fixed inset-0 z-0">
          <Image
            src={flierUrl}
            alt=""
            fill
            className="object-cover"
            style={{
              filter: "blur(25px)",
              transform: "scale(1.1)",
              opacity: 0.6,
            }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/50 to-void/70" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-void via-raised to-void" />
      )}

      {/* Navigation Bar - Matches global DockNav pattern */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto font-sans">
        <div className="flex items-center rounded-full border border-border-strong backdrop-blur-xl bg-void/90 shadow-2xl shadow-void/50 ring-1 ring-border-subtle py-2 px-3">
          {/* Logo Section */}
          <div className="flex items-center gap-2 pr-3 border-r border-border-strong">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <Logo variant="tricolor" size="sm" iconOnly className="sm:hidden" />
              <Logo variant="tricolor" size="sm" className="hidden sm:flex" />
            </Link>
          </div>
          
          {/* Nav Links */}
          <div className="flex items-center gap-0.5 pl-2">
            {/* Nav Items */}
            {navLoading ? (
              <>
                {/* Browse link for all users */}
                <Link 
                  href="/browse" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                >
                  Browse
                </Link>
                {/* FAQ link */}
                <Link 
                  href="/faq" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                >
                  FAQ
                </Link>
                {/* Login button */}
                <Link 
                  href="/login" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-void bg-gradient-to-r from-accent-secondary to-accent-primary hover:opacity-90 shadow-lg"
                >
                  Login
                </Link>
              </>
            ) : navUser ? (
              <>
                {/* ME link */}
                <Link 
                  href="/me" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                >
                  Me
                </Link>
                {/* Browse link */}
                <Link 
                  href="/browse" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                >
                  Browse
                </Link>
                {/* Avatar Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all duration-300 hover:bg-active"
                  >
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent-secondary to-accent-primary flex items-center justify-center text-void text-xs font-bold">
                      {getNavUserInitial()}
                    </div>
                    <ChevronDown className={`h-3 w-3 text-secondary transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-border-strong backdrop-blur-xl bg-glass shadow-2xl shadow-void/50 ring-1 ring-border-subtle overflow-hidden">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-border-subtle">
                        <p className="text-sm font-bold text-primary truncate">
                          {navUser.name || "Guest"}
                        </p>
                        <p className="font-mono text-[10px] text-muted truncate">{navUser.email}</p>
                      </div>

                      {/* Profile Links */}
                      <div className="py-1">
                        <Link
                          href="/me"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Me
                        </Link>
                        <Link
                          href="/me/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-border-subtle py-1">
                        <button
                          onClick={handleNavLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-accent-error hover:bg-active transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Browse link for all users */}
                <Link 
                  href="/browse" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-secondary hover:text-white hover:bg-active/50"
                >
                  Browse
                </Link>
                {/* Login button with gradient */}
                <Link 
                  href="/login" 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap text-void bg-gradient-to-r from-accent-secondary to-accent-primary hover:opacity-90 shadow-lg"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-2xl flex flex-col justify-center pt-20 sm:pt-24" style={{ 
        maxHeight: typeof window !== "undefined" && window.innerWidth < 640 ? "100dvh" : "100vh",
        minHeight: 0,
      }}>
        {/* Event Context Badge */}
        {eventName && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 sm:mb-6 flex-shrink-0"
          >
            <div className="bg-glass backdrop-blur-md rounded-2xl border border-border-subtle p-4 sm:p-5 shadow-soft">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Flier Image */}
                  {eventDetails?.flierUrl && (
                    <div className="flex-shrink-0">
                      <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden border border-border-subtle bg-raised">
                        <Image
                          src={eventDetails.flierUrl}
                          alt={`${eventName} flier`}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Registering for</p>
                    <h3 className="font-sans text-xl sm:text-2xl md:text-3xl font-black text-primary uppercase tracking-tight break-words leading-tight">{eventName}</h3>
                    {(eventDetails?.venueName || eventDetails?.startTime) && (
                      <div className="flex items-center gap-2 sm:gap-3 mt-3 text-xs sm:text-sm text-secondary flex-wrap">
                        {eventDetails.venueName && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-accent-secondary" />
                            <span className="truncate max-w-[200px] sm:max-w-none">{eventDetails.venueName}</span>
                          </div>
                        )}
                        {eventDetails.startTime && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-accent-secondary" />
                            <span>{new Date(eventDetails.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {eventDetails?.registrationCount !== undefined && eventDetails.registrationCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-secondary bg-active px-3 py-2 rounded-lg border border-border-subtle self-start sm:self-auto">
                    <Users className="h-4 w-4 flex-shrink-0 text-accent-primary" />
                    <span className="whitespace-nowrap">{eventDetails.registrationCount} {eventDetails.registrationCount === 1 ? 'person' : 'people'} registered</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Progress Bar with Step Dots */}
        {visibleSteps.length > 0 && (
          <div className="mb-3 sm:mb-6 flex-shrink-0">
            <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${stepProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                Step {currentStep + 1} of {visibleSteps.length}
              </p>
            {visibleSteps.length > 1 && (
              <p className="font-mono text-[10px] text-muted">
                ~{Math.max(1, Math.ceil((visibleSteps.length - currentStep - 1) * 0.5))} min left
              </p>
            )}
          </div>
          {/* Step Dots */}
          {visibleSteps.length <= 7 && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {visibleSteps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-all ${
                    index <= currentStep ? "bg-accent-secondary" : "bg-border-subtle"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ 
                    scale: index === currentStep ? 1.2 : index < currentStep ? 1 : 0.8,
                    opacity: index <= currentStep ? 1 : 0.4
                  }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          )}
          </div>
        )}

        {/* Form Container */}
        {visibleSteps.length === 0 ? (
          // Show loading state when auto-submitting (all fields already filled)
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-glass backdrop-blur-md rounded-2xl border border-border-subtle p-4 sm:p-6 md:p-8 lg:p-12 shadow-soft flex-shrink-0 min-w-0"
          >
            <div className="flex flex-col items-center justify-center py-8">
              <InlineSpinner size="lg" className="mb-4" />
              <p className="text-secondary text-center">Completing registration...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            ref={formContainerRef}
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-glass backdrop-blur-md rounded-2xl border border-border-subtle p-4 sm:p-6 md:p-8 lg:p-12 shadow-soft flex-shrink-0 min-w-0"
            style={{ 
              // Add scroll margin to ensure form stays visible above keyboard
              scrollMarginBottom: "2rem",
            }}
          >
            {/* Question */}
            <motion.h2
              key={`question-${currentStep}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="font-sans text-2xl sm:text-3xl md:text-4xl font-black text-primary mb-6 sm:mb-8 text-center px-2"
            >
              {getLabel()}
            </motion.h2>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {visibleSteps.length > 0 && getInputComponent()}
            {visibleSteps.length > 0 && currentStep < visibleSteps.length && errors[visibleSteps[currentStep] as keyof SignupData] && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-accent-error text-sm mt-2 text-center"
              >
                {errors[visibleSteps[currentStep] as keyof SignupData]}
              </motion.p>
            )}
          </motion.div>

          {/* Navigation */}
          {visibleSteps.length > 0 && currentStep < visibleSteps.length && (visibleSteps[currentStep] !== "email" || emailVerified) && !magicLinkSent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex items-center justify-between mt-4 sm:mt-6 md:mt-8 gap-3 flex-shrink-0"
            >
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading || sendingMagicLink}
                className="flex items-center gap-2 flex-1 sm:flex-initial text-base sm:text-sm py-3 sm:py-2"
              >
                Back
              </Button>

              <Button
                variant="primary"
                onClick={async () => {
                  if (currentStep === visibleSteps.length - 1) {
                    // On last step, directly call handleSubmit instead of handleNext
                    await handleSubmit();
                  } else {
                    handleNext();
                  }
                }}
                disabled={isLoading || sendingMagicLink}
                loading={isLoading && currentStep === visibleSteps.length - 1}
                className="flex items-center gap-2 flex-1 sm:flex-initial text-base sm:text-sm py-3 sm:py-2"
              >
                {currentStep === visibleSteps.length - 1 ? (
                  <>
                    Complete <Check className="h-5 w-5 sm:h-4 sm:w-4" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Send magic link button for email step */}
          {visibleSteps.length > 0 && currentStep < visibleSteps.length && visibleSteps[currentStep] === "email" && !emailVerified && !magicLinkSent && !showPasswordFallback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mt-4 sm:mt-6 md:mt-8 flex-shrink-0"
            >
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={sendingMagicLink || !formData.email}
                loading={sendingMagicLink}
                className="w-full text-base sm:text-sm py-3 sm:py-2 flex items-center justify-center gap-2"
              >
                {sendingMagicLink ? (
                  <>
                    Sending... <InlineSpinner size="md" />
                  </>
                ) : (
                  <>
                    Send OTP Code <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Password signup button when rate limited */}
          {visibleSteps.length > 0 && currentStep < visibleSteps.length && visibleSteps[currentStep] === "email" && showPasswordFallback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mt-4 sm:mt-6 md:mt-8 flex-shrink-0"
            >
              <Button
                variant="primary"
                onClick={handlePasswordSignup}
                disabled={sendingMagicLink || password.length < 6 || password !== confirmPassword}
                loading={sendingMagicLink}
                className="w-full text-base sm:text-sm py-3 sm:py-2 flex items-center justify-center gap-2"
              >
                {sendingMagicLink ? (
                  <>
                    Creating account... <InlineSpinner size="md" />
                  </>
                ) : (
                  <>
                    Create Account & Continue <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

            {/* Email hint (subtle) */}
            {emailVerified && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-mono text-xs text-muted text-center mt-4 sm:mt-6"
              >
                {formData.email}
              </motion.p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

