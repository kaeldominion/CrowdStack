"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "@crowdstack/ui";
import { Calendar, Instagram, MessageCircle, User, ArrowRight, Check } from "lucide-react";

interface TypeformSignupProps {
  email: string; // Email from magic link
  onSubmit: (data: SignupData) => Promise<void>;
  isLoading?: boolean;
}

export interface SignupData {
  name: string;
  surname: string;
  date_of_birth: string;
  whatsapp: string;
  instagram_handle: string;
}

type StepId = "name" | "surname" | "date_of_birth" | "whatsapp" | "instagram_handle";

const steps: Array<{ id: StepId; label: string }> = [
  { id: "name", label: "What's your first name?" },
  { id: "surname", label: "And your last name?" },
  { id: "date_of_birth", label: "When were you born?" },
  { id: "whatsapp", label: "What's your WhatsApp number?" },
  { id: "instagram_handle", label: "What's your Instagram handle?" },
];

export function TypeformSignup({ email, onSubmit, isLoading = false }: TypeformSignupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SignupData>({
    name: "",
    surname: "",
    date_of_birth: "",
    whatsapp: "",
    instagram_handle: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SignupData, string>>>({});

  const validateStep = (step: number): boolean => {
    const stepKey = steps[step].id as keyof SignupData;
    const value = formData[stepKey];

    if (!value || !value.trim()) {
      setErrors({ [stepKey]: "This field is required" });
      return false;
    }

    // Specific validations
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

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
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
              placeholder="Enter your first name"
              className="text-2xl py-6 text-center border-2 focus:border-primary"
              autoFocus
              autoComplete="given-name"
            />
          </div>
        );

      case "surname":
        return (
          <div className="space-y-4">
            <Input
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, surname: e.target.value });
                if (error) setErrors({ ...errors, surname: undefined });
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your last name"
              className="text-2xl py-6 text-center border-2 focus:border-primary"
              autoFocus
              autoComplete="family-name"
            />
          </div>
        );

      case "date_of_birth":
        return (
          <div className="space-y-4">
            <Input
              type="date"
              value={value}
              onChange={(e) => {
                setFormData({ ...formData, date_of_birth: e.target.value });
                if (error) setErrors({ ...errors, date_of_birth: undefined });
              }}
              onKeyDown={handleKeyDown}
              className="text-2xl py-6 text-center border-2 focus:border-primary"
              autoFocus
            />
          </div>
        );

      case "whatsapp":
        return (
          <div className="space-y-4">
            <div className="relative">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
              <Input
                value={value}
                onChange={(e) => {
                  setFormData({ ...formData, whatsapp: e.target.value });
                  if (error) setErrors({ ...errors, whatsapp: undefined });
                }}
                onKeyDown={handleKeyDown}
                placeholder="+1234567890"
                className="text-2xl py-6 pl-14 text-center border-2 focus:border-primary"
                autoFocus
                autoComplete="tel"
              />
            </div>
            <p className="text-sm text-white/60 text-center">We'll use this to send you event updates</p>
          </div>
        );

      case "instagram_handle":
        return (
          <div className="space-y-4">
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/40" />
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
                className="text-2xl py-6 pl-14 text-center border-2 focus:border-primary"
                autoFocus
              />
            </div>
            <p className="text-sm text-white/60 text-center">We'll tag you in event photos</p>
          </div>
        );

      default:
        return null;
    }
  };

  const stepProgress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/80"
              initial={{ width: 0 }}
              animate={{ width: `${stepProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Form Container */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 sm:p-12 shadow-2xl"
        >
          {/* Question */}
          <motion.h2
            key={`question-${currentStep}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center"
          >
            {steps[currentStep].label}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-center justify-between mt-8"
          >
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
              className="flex items-center gap-2"
            >
              Back
            </Button>

            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isLoading}
              loading={isLoading && currentStep === steps.length - 1}
              className="flex items-center gap-2"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Complete <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {/* Email hint (subtle) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-white/30 text-center mt-6"
          >
            Signing up as {email}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

