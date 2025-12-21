"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button, Logo, InlineSpinner } from "@crowdstack/ui";
import { Calendar, Instagram, MessageCircle, User, ArrowRight, Check, Mail, MapPin, Users, ChevronDown, Settings, LogOut } from "lucide-react";
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
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } | null;
  forcePasswordFallback?: boolean; // If true, show password fallback immediately
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

export function TypeformSignup({ onSubmit, isLoading = false, redirectUrl, onEmailVerified, eventSlug, existingProfile, forcePasswordFallback = false, eventName, eventDetails }: TypeformSignupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [showPasswordFallback, setShowPasswordFallback] = useState(forcePasswordFallback);
  const [passwordFallbackFromMagicLink, setPasswordFallbackFromMagicLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  
  // Navigation auth state
  const router = useRouter();
  const [navUser, setNavUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [navLoading, setNavLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Determine which steps to show based on existing profile and email verification status
  const visibleSteps = useMemo(() => {
    const visible: StepId[] = [];
    
    // Always show email step if not verified
    if (!emailVerified) {
      visible.push("email");
    }
    
    // Only show fields that are missing
    if (!existingProfile?.name) visible.push("name");
    if (!existingProfile?.surname) visible.push("surname");
    if (!existingProfile?.date_of_birth) visible.push("date_of_birth");
    if (!(existingProfile as any)?.gender) visible.push("gender");
    if (!existingProfile?.whatsapp) visible.push("whatsapp");
    if (!existingProfile?.instagram_handle) visible.push("instagram_handle");
    
    return visible;
  }, [emailVerified, existingProfile]);

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
    if (existingProfile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || existingProfile.name || "",
        surname: prev.surname || existingProfile.surname || "",
        date_of_birth: prev.date_of_birth || existingProfile.date_of_birth || "",
        gender: prev.gender || (existingProfile as any)?.gender || "male",
        whatsapp: prev.whatsapp || existingProfile.whatsapp || "",
        instagram_handle: prev.instagram_handle || existingProfile.instagram_handle || "",
      }));
    }
  }, [existingProfile]);

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
    const stepKey = visibleSteps[step] as keyof SignupData;
    const value = formData[stepKey];

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

    if (stepKey === "whatsapp") {
      const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
      if (!whatsappRegex.test(value.replace(/\s/g, ""))) {
        setErrors({ [stepKey]: "Please enter a valid WhatsApp number (e.g., +1234567890)" });
        return false;
      }
    }

    if (stepKey === "date_of_birth") {
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      if (age < 13 || age > 120) {
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
        
        if (visibleSteps.length > 1) {
          setCurrentStep(1);
        }
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
      
      if (visibleSteps.length > 1) {
        setCurrentStep(1); // Move to next step
      }
    } catch (err: any) {
      setErrors({ email: err.message || "Failed to create account" });
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleNext = async () => {
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
      
      // Validate that all required fields are present before submitting
      if (!mergedData.email || !mergedData.name || !mergedData.surname || !mergedData.date_of_birth || !mergedData.gender || !mergedData.whatsapp || !mergedData.instagram_handle) {
        const missingFields = [];
        if (!mergedData.email) missingFields.push("email");
        if (!mergedData.name) missingFields.push("name");
        if (!mergedData.surname) missingFields.push("surname");
        if (!mergedData.date_of_birth) missingFields.push("date of birth");
        if (!mergedData.gender) missingFields.push("gender");
        if (!mergedData.whatsapp) missingFields.push("whatsapp");
        if (!mergedData.instagram_handle) missingFields.push("instagram handle");
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-blue-400 text-sm text-center mb-2">
                  Magic link not working? Use a password instead.
                </p>
                <p className="text-blue-300/70 text-xs text-center">
                  If you already have an account, use your existing password to sign in.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-yellow-400 text-sm text-center mb-2">
                  Email rate limit reached. Please set a password to continue.
                </p>
                <p className="text-yellow-300/70 text-xs text-center">
                  If you already have an account, use your existing password to sign in.
                </p>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="your@email.com"
                className="text-xl sm:text-2xl py-4 sm:py-6 pl-14 text-center border-2 focus:border-primary w-full"
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
              className="text-xl sm:text-2xl py-4 sm:py-6 text-center border-2 focus:border-primary w-full"
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
              className="text-xl sm:text-2xl py-4 sm:py-6 text-center border-2 focus:border-primary w-full"
              autoComplete="new-password"
              minLength={6}
            />
            <p className="text-xs text-white/60 text-center px-4">
              Your account will be created and you can continue registration
            </p>
          </div>
        );
      }

      if (magicLinkSent && !emailVerified) {
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4 py-8">
              <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Check your email!</h3>
                {magicLinkError ? (
                  <>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3 mt-3">
                      <p className="text-yellow-400 text-xs text-center">
                        {magicLinkError.includes("rate limit") || magicLinkError.includes("too many")
                          ? "Email rate limit reached. The magic link may not have been sent."
                          : "There was an issue sending the magic link."}
                      </p>
                    </div>
                    <p className="text-white/70 text-sm">
                      We tried to send a magic link to <span className="font-medium">{formData.email}</span>
                    </p>
                    <p className="text-white/50 text-xs mt-2">
                      If you don't receive it, use the password option below.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-white/70 text-sm">
                      We sent a magic link to <span className="font-medium">{formData.email}</span>
                    </p>
                    <p className="text-white/50 text-xs mt-2">
                      Click the link in the same browser to continue
                    </p>
                  </>
                )}
              </div>
              <div className="pt-4 space-y-3">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const supabase = createBrowserClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.email) {
                      setEmailVerified(true);
                      // Check if already registered (if callback provided)
                      if (onEmailVerified) {
                        const alreadyRegistered = await onEmailVerified();
                        if (alreadyRegistered) {
                          return; // Parent component will handle showing success
                        }
                      }
                      setCurrentStep(1);
                    }
                  }}
                  className="w-full"
                >
                  I've clicked the link
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    // Store email in sessionStorage to preserve it
                    if (typeof window !== "undefined" && formData.email) {
                      sessionStorage.setItem("pending_registration_email", formData.email);
                    }
                    // Switch to password fallback mode
                    setPasswordFallbackFromMagicLink(true);
                    setShowPasswordFallback(true);
                    setMagicLinkSent(false);
                    setMagicLinkError(null);
                  }}
                  className="w-full text-white/70 hover:text-white hover:bg-white/5"
                >
                  Use password instead
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
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
              placeholder="your@email.com"
              className="text-2xl sm:text-3xl py-6 sm:py-8 pl-14 text-center border-2 focus:border-primary w-full"
              autoFocus
              autoComplete="email"
              inputMode="email"
            />
          </div>
          <p className="text-sm text-white/60 text-center px-4">
            We'll send you a magic link to verify your email
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
              placeholder="First name"
              className="text-2xl sm:text-3xl py-6 sm:py-8 text-center border-2 focus:border-primary w-full"
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
              placeholder="Last name"
              className="text-xl sm:text-2xl md:text-3xl py-4 sm:py-6 md:py-8 text-center border-2 focus:border-primary w-full"
              autoFocus
              autoComplete="family-name"
            />
          </div>
        );

      case "date_of_birth":
        return (
          <div className="space-y-3 sm:space-y-4">
            <Input
              type="date"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, date_of_birth: e.target.value });
                if (error) setErrors({ ...errors, date_of_birth: undefined });
              }}
              onKeyDown={handleKeyDown}
              className="text-base sm:text-lg md:text-xl py-4 sm:py-6 md:py-8 text-center border-2 focus:border-primary w-full"
              autoFocus
            />
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
                    ? "bg-primary/20 border-primary text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                <span className="text-xl sm:text-2xl font-semibold">Male</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, gender: "female" });
                  if (error) setErrors({ ...errors, gender: undefined });
                }}
                className={`flex-1 py-6 sm:py-8 rounded-xl border-2 transition-all ${
                  formData.gender === "female"
                    ? "bg-primary/20 border-primary text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                <span className="text-xl sm:text-2xl font-semibold">Female</span>
              </button>
            </div>
          </div>
        );

      case "whatsapp":
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <MessageCircle className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-white/40" />
              <Input
                value={value}
                onChange={(e) => {
                  setFormData({ ...formData, whatsapp: e.target.value });
                  if (error) setErrors({ ...errors, whatsapp: undefined });
                }}
                onKeyDown={handleKeyDown}
                placeholder="+1234567890"
                className="text-xl sm:text-2xl md:text-3xl py-4 sm:py-6 md:py-8 pl-12 sm:pl-14 text-center border-2 focus:border-primary w-full"
                autoFocus
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <p className="text-xs sm:text-sm text-white/60 text-center px-4">We'll use this to send you event updates</p>
          </div>
        );

      case "instagram_handle":
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Instagram className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-white/40" />
              <Input
                value={value}
                onChange={(e) => {
                  // Remove @ if user adds it
                  const handle = e.target.value.replace("@", "");
                  setFormData({ ...formData, instagram_handle: handle });
                  if (error) setErrors({ ...errors, instagram_handle: undefined });
                }}
                onKeyDown={handleKeyDown}
                placeholder="username"
                className="text-xl sm:text-2xl md:text-3xl py-4 sm:py-6 md:py-8 pl-12 sm:pl-14 text-center border-2 focus:border-primary w-full"
                autoFocus
                autoComplete="username"
              />
            </div>
            <p className="text-xs sm:text-sm text-white/60 text-center px-4">We'll tag you in event photos</p>
          </div>
        );

      default:
        return null;
    }
  };

  const stepProgress = emailVerified 
    ? ((currentStep + 1) / visibleSteps.length) * 100 
    : ((currentStep + 1) / visibleSteps.length) * 100;

  // Use mobile-optimized label on small screens
  const getLabel = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const stepId = visibleSteps[currentStep];
    const step = steps.find(s => s.id === stepId);
    if (!step) return "";
    return isMobile && step.mobileLabel ? step.mobileLabel : step.label;
  };

  const flierUrl = eventDetails?.flierUrl;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ 
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        // Use 100dvh on mobile to account for dynamic viewport changes (keyboard)
        height: typeof window !== "undefined" && window.innerWidth < 640 ? "100dvh" : "100vh",
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      )}

      {/* Navigation Bar */}
      <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-fit mx-auto sm:top-4">
        <div className="flex h-12 sm:h-14 items-center gap-2 px-3 sm:px-4 md:px-6 rounded-full border border-white/20 backdrop-blur-xl bg-black/40 shadow-lg shadow-black/50">
          <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105 pr-2">
            <Logo variant="full" size="sm" animated={false} className="text-white" />
          </Link>
          
          <div className="h-4 w-px bg-white/20" />
          
          {/* Auth-aware navigation */}
          {navLoading ? (
            <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap px-2">
              Log in
            </Link>
          ) : navUser ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-full transition-all duration-300 text-white/80 hover:text-white hover:bg-white/5"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                  {getNavUserInitial()}
                </div>
                <span className="hidden sm:inline max-w-20 truncate text-xs">{getNavDisplayName()}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-white/20 backdrop-blur-xl bg-black/90 shadow-lg shadow-black/50 overflow-hidden">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">
                      {navUser.name || "Guest"}
                    </p>
                    <p className="text-xs text-white/50 truncate">{navUser.email}</p>
                  </div>

                  {/* Profile Links */}
                  <div className="py-1">
                    <Link
                      href="/me"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      My Events
                    </Link>
                    <Link
                      href="/me/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Profile
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-white/10 py-1">
                    <button
                      onClick={handleNavLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-all duration-300 whitespace-nowrap px-2">
              Log in
            </Link>
          )}
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
            <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/15 p-4 sm:p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-white/50 mb-2">Registering for</p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words leading-tight">{eventName}</h3>
                  {(eventDetails?.venueName || eventDetails?.startTime) && (
                    <div className="flex items-center gap-2 sm:gap-3 mt-3 text-xs sm:text-sm text-white/60 flex-wrap">
                      {eventDetails.venueName && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-none">{eventDetails.venueName}</span>
                        </div>
                      )}
                      {eventDetails.startTime && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>{new Date(eventDetails.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {eventDetails?.registrationCount !== undefined && eventDetails.registrationCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/60 bg-white/5 px-3 py-2 rounded-lg border border-white/10 self-start sm:self-auto">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{eventDetails.registrationCount} {eventDetails.registrationCount === 1 ? 'person' : 'people'} registered</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Progress Bar with Step Dots */}
        <div className="mb-3 sm:mb-6 flex-shrink-0">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80"
              initial={{ width: 0 }}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs sm:text-sm text-white/60 font-medium">
              Step {currentStep + 1} of {visibleSteps.length}
            </p>
            {visibleSteps.length > 1 && (
              <p className="text-xs text-white/40">
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
                    index <= currentStep ? "bg-primary" : "bg-white/20"
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

        {/* Form Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/15 p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl flex-shrink min-w-0 overflow-y-auto overscroll-contain"
          style={{ 
            maxHeight: typeof window !== "undefined" && window.innerWidth < 640 
              ? "calc(100dvh - 6rem)" 
              : "calc(100vh - 12rem)",
            // Prevent scroll bounce on iOS
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Question */}
          <motion.h2
            key={`question-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 sm:mb-8 text-center px-2"
          >
            {getLabel()}
          </motion.h2>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {getInputComponent()}
            {errors[visibleSteps[currentStep] as keyof SignupData] && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm mt-2 text-center"
              >
                {errors[visibleSteps[currentStep] as keyof SignupData]}
              </motion.p>
            )}
          </motion.div>

          {/* Navigation */}
          {(visibleSteps[currentStep] !== "email" || emailVerified) && !magicLinkSent && (
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
          {visibleSteps[currentStep] === "email" && !emailVerified && !magicLinkSent && !showPasswordFallback && (
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
                    Send Magic Link <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Password signup button when rate limited */}
          {visibleSteps[currentStep] === "email" && showPasswordFallback && (
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
              className="text-xs text-white/30 text-center mt-4 sm:mt-6"
            >
              {formData.email}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

