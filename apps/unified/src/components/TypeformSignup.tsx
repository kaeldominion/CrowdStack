"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "@crowdstack/ui";
import { Calendar, Instagram, MessageCircle, User, ArrowRight, Check, Mail, Loader2 } from "lucide-react";

interface TypeformSignupProps {
  onSubmit: (data: SignupData) => Promise<void>;
  isLoading?: boolean;
  redirectUrl?: string; // URL to redirect to after magic link
  onEmailVerified?: () => Promise<boolean>; // Callback when email is verified, return true if already registered
  eventSlug?: string; // Event slug for checking registration
}

export interface SignupData {
  email: string;
  name: string;
  surname: string;
  date_of_birth: string;
  whatsapp: string;
  instagram_handle: string;
}

type StepId = "email" | "name" | "surname" | "date_of_birth" | "whatsapp" | "instagram_handle";

const steps: Array<{ id: StepId; label: string; mobileLabel?: string }> = [
  { id: "email", label: "What's your email?", mobileLabel: "What's your email?" },
  { id: "name", label: "What's your first name?", mobileLabel: "First name?" },
  { id: "surname", label: "And your last name?", mobileLabel: "Last name?" },
  { id: "date_of_birth", label: "When were you born?", mobileLabel: "Date of birth?" },
  { id: "whatsapp", label: "What's your WhatsApp number?", mobileLabel: "WhatsApp number?" },
  { id: "instagram_handle", label: "What's your Instagram handle?", mobileLabel: "Instagram handle?" },
];

export function TypeformSignup({ onSubmit, isLoading = false, redirectUrl, onEmailVerified, eventSlug }: TypeformSignupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [formData, setFormData] = useState<SignupData>({
    email: "",
    name: "",
    surname: "",
    date_of_birth: "",
    whatsapp: "",
    instagram_handle: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setFormData(prev => ({ ...prev, email: user.email! }));
        setEmailVerified(true);
        // Skip email step if already authenticated
        setCurrentStep(1);
      }
    };
    checkAuth();
  }, []);

  const validateStep = (step: number): boolean => {
    const stepKey = steps[step].id as keyof SignupData;
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
        throw new Error(data.error || "Failed to send magic link");
      }

      setMagicLinkSent(true);
    } catch (err: any) {
      setErrors({ email: err.message || "Failed to send magic link" });
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleNext = async () => {
    // Special handling for email step
    if (currentStep === 0 && !emailVerified) {
      await handleSendMagicLink();
      return;
    }

    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
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
    if (validateStep(currentStep)) {
      await onSubmit(formData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const getInputComponent = () => {
    const stepKey = steps[currentStep].id as keyof SignupData;
    const value = formData[stepKey];
    const error = errors[stepKey];

    // Email step with magic link
    if (stepKey === "email") {
      if (magicLinkSent && !emailVerified) {
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4 py-8">
              <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Check your email!</h3>
                <p className="text-white/70 text-sm">
                  We sent a magic link to <span className="font-medium">{formData.email}</span>
                </p>
                <p className="text-white/50 text-xs mt-2">
                  Click the link in the same browser to continue
                </p>
              </div>
              <div className="pt-4">
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
    ? ((currentStep) / (steps.length - 1)) * 100 
    : ((currentStep + 1) / steps.length) * 100;

  // Use mobile-optimized label on small screens
  const getLabel = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const step = steps[currentStep];
    return isMobile && step.mobileLabel ? step.mobileLabel : step.label;
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ 
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
        // Use 100dvh on mobile to account for dynamic viewport changes (keyboard)
        height: typeof window !== "undefined" && window.innerWidth < 640 ? "100dvh" : "100vh",
      }}
    >
      <div className="w-full max-w-2xl flex flex-col justify-center" style={{ 
        maxHeight: typeof window !== "undefined" && window.innerWidth < 640 ? "100dvh" : "100vh",
        minHeight: 0,
      }}>
        {/* Progress Bar */}
        <div className="mb-3 sm:mb-6 flex-shrink-0">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80"
              initial={{ width: 0 }}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            {emailVerified 
              ? `Step ${currentStep} of ${steps.length - 1}`
              : `Step ${currentStep + 1} of ${steps.length}`}
          </p>
        </div>

        {/* Form Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl flex-shrink min-w-0 overflow-y-auto overscroll-contain"
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
            {errors[steps[currentStep].id as keyof SignupData] && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm mt-2 text-center"
              >
                {errors[steps[currentStep].id as keyof SignupData]}
              </motion.p>
            )}
          </motion.div>

          {/* Navigation */}
          {(currentStep !== 0 || emailVerified) && !magicLinkSent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex items-center justify-between mt-4 sm:mt-6 md:mt-8 gap-3 flex-shrink-0"
            >
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={(currentStep === (emailVerified ? 1 : 0)) || isLoading || sendingMagicLink}
                className="flex items-center gap-2 flex-1 sm:flex-initial text-base sm:text-sm py-3 sm:py-2"
              >
                Back
              </Button>

              <Button
                variant="primary"
                onClick={handleNext}
                disabled={isLoading || sendingMagicLink}
                loading={isLoading && currentStep === steps.length - 1}
                className="flex items-center gap-2 flex-1 sm:flex-initial text-base sm:text-sm py-3 sm:py-2"
              >
                {currentStep === steps.length - 1 ? (
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
          {currentStep === 0 && !emailVerified && !magicLinkSent && (
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
                    Sending... <Loader2 className="h-5 w-5 animate-spin" />
                  </>
                ) : (
                  <>
                    Send Magic Link <ArrowRight className="h-5 w-5" />
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

