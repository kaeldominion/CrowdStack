"use client";

/**
 * TABLE JOIN FORM
 *
 * Simplified single-page form for table party guests.
 * Mobile-first design with all fields visible.
 * Pre-fills existing profile data and highlights missing required fields.
 */

import { useState, useEffect } from "react";
import { Input, Button } from "@crowdstack/ui";
import {
  User,
  Calendar,
  Instagram,
  MessageCircle,
  Check,
  AlertCircle,
} from "lucide-react";

export interface TableJoinFormData {
  name: string;
  surname: string;
  date_of_birth: string;
  gender: "male" | "female";
  instagram_handle: string;
  whatsapp: string;
}

interface TableJoinFormProps {
  /** Existing profile data to pre-fill */
  existingProfile?: {
    name?: string | null;
    surname?: string | null;
    date_of_birth?: string | null;
    gender?: "male" | "female" | null;
    instagram_handle?: string | null;
    whatsapp?: string | null;
  } | null;
  /** Callback when form is submitted */
  onSubmit: (data: TableJoinFormData) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** User's email (from auth) */
  userEmail?: string;
}

export function TableJoinForm({
  existingProfile,
  onSubmit,
  isLoading = false,
  error,
  userEmail,
}: TableJoinFormProps) {
  const [formData, setFormData] = useState<TableJoinFormData>({
    name: existingProfile?.name || "",
    surname: existingProfile?.surname || "",
    date_of_birth: existingProfile?.date_of_birth || "",
    gender: existingProfile?.gender || "male",
    instagram_handle: existingProfile?.instagram_handle || "",
    whatsapp: existingProfile?.whatsapp || "",
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TableJoinFormData, string>>>({});
  const [touched, setTouched] = useState<Set<keyof TableJoinFormData>>(new Set());

  // Update form when existingProfile changes
  // IMPORTANT: User input (prev) takes priority over profile data
  // This prevents overwriting what the user typed if the profile loads late
  useEffect(() => {
    if (existingProfile) {
      setFormData(prev => ({
        name: prev.name || existingProfile.name || "",
        surname: prev.surname || existingProfile.surname || "",
        date_of_birth: prev.date_of_birth || existingProfile.date_of_birth || "",
        gender: prev.gender || existingProfile.gender || "male",
        instagram_handle: prev.instagram_handle || existingProfile.instagram_handle || "",
        whatsapp: prev.whatsapp || existingProfile.whatsapp || "",
      }));
    }
  }, [existingProfile]);

  // Check which required fields are already filled
  const isFieldComplete = (field: keyof TableJoinFormData): boolean => {
    const value = formData[field];
    if (!value) return false;
    if (typeof value === "string" && !value.trim()) return false;
    return true;
  };

  const requiredFields: (keyof TableJoinFormData)[] = ["name", "surname", "date_of_birth", "gender"];
  const completedRequired = requiredFields.filter(isFieldComplete).length;
  const totalRequired = requiredFields.length;
  const allRequiredComplete = completedRequired === totalRequired;

  // Validation
  const validateField = (field: keyof TableJoinFormData, value: string): string | null => {
    switch (field) {
      case "name":
        if (!value.trim()) return "First name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return null;
      case "surname":
        if (!value.trim()) return "Last name is required";
        if (value.trim().length < 2) return "Last name must be at least 2 characters";
        return null;
      case "date_of_birth":
        if (!value) return "Date of birth is required";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "Invalid date";
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
          age--;
        }
        if (age < 18) return "You must be 18 or older";
        if (age > 120) return "Invalid date of birth";
        return null;
      case "whatsapp":
        if (value && value.trim()) {
          const whatsappRegex = /^\+?[1-9]\d{6,14}$/;
          if (!whatsappRegex.test(value.replace(/\s/g, ""))) {
            return "Enter a valid number (e.g. +1234567890)";
          }
        }
        return null;
      default:
        return null;
    }
  };

  const handleChange = (field: keyof TableJoinFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof TableJoinFormData) => {
    setTouched(prev => new Set(prev).add(field));
    const error = validateField(field, formData[field]);
    if (error) {
      setFieldErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const errors: Partial<Record<keyof TableJoinFormData, string>> = {};
    for (const field of requiredFields) {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    }

    // Also validate optional fields if they have values
    const whatsappError = validateField("whatsapp", formData.whatsapp);
    if (whatsappError) {
      errors.whatsapp = whatsappError;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Mark all required fields as touched to show errors
      setTouched(new Set([...requiredFields, "whatsapp"]));
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Progress indicator */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label-mono">Profile completion</span>
          <span className="text-sm font-medium text-primary">
            {completedRequired}/{totalRequired} required
          </span>
        </div>
        <div className="h-2 bg-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
            style={{ width: `${(completedRequired / totalRequired) * 100}%` }}
          />
        </div>
        {userEmail && (
          <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-accent-success" />
            Signed in as {userEmail}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-error/10 border border-accent-error/30">
          <AlertCircle className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-accent-error">{error}</p>
        </div>
      )}

      {/* Required fields section */}
      <div className="space-y-4">
        <p className="label-mono flex items-center gap-2">
          Required info
          {allRequiredComplete && (
            <Check className="w-4 h-4 text-accent-success" />
          )}
        </p>

        {/* Name fields - side by side on mobile */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <User className="w-5 h-5 text-muted" />
            </div>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="First name"
              className={`pl-10 py-4 text-base ${
                isFieldComplete("name") && !fieldErrors.name
                  ? "border-accent-success/50"
                  : ""
              }`}
              error={touched.has("name") ? fieldErrors.name : undefined}
              autoComplete="given-name"
            />
          </div>
          <div>
            <Input
              value={formData.surname}
              onChange={(e) => handleChange("surname", e.target.value)}
              onBlur={() => handleBlur("surname")}
              placeholder="Last name"
              className={`py-4 text-base ${
                isFieldComplete("surname") && !fieldErrors.surname
                  ? "border-accent-success/50"
                  : ""
              }`}
              error={touched.has("surname") ? fieldErrors.surname : undefined}
              autoComplete="family-name"
            />
          </div>
        </div>

        {/* Date of birth */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar className="w-5 h-5 text-muted" />
          </div>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => handleChange("date_of_birth", e.target.value)}
            onBlur={() => handleBlur("date_of_birth")}
            className={`pl-10 py-4 text-base [&::-webkit-calendar-picker-indicator]:opacity-100 ${
              isFieldComplete("date_of_birth") && !fieldErrors.date_of_birth
                ? "border-accent-success/50"
                : ""
            }`}
            error={touched.has("date_of_birth") ? fieldErrors.date_of_birth : undefined}
            max={new Date().toISOString().split("T")[0]}
            min="1920-01-01"
          />
          {!formData.date_of_birth && (
            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-muted pointer-events-none text-sm">
              Date of birth
            </span>
          )}
        </div>

        {/* Gender selection - large touch targets */}
        <div>
          {fieldErrors.gender && touched.has("gender") && (
            <p className="text-sm text-accent-error mb-2">{fieldErrors.gender}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleChange("gender", "male")}
              className={`py-4 rounded-xl border-2 font-medium text-base transition-all active:scale-[0.98] ${
                formData.gender === "male"
                  ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                  : "bg-raised border-border-subtle text-secondary hover:border-border-strong"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => handleChange("gender", "female")}
              className={`py-4 rounded-xl border-2 font-medium text-base transition-all active:scale-[0.98] ${
                formData.gender === "female"
                  ? "bg-accent-secondary/20 border-accent-secondary text-primary"
                  : "bg-raised border-border-subtle text-secondary hover:border-border-strong"
              }`}
            >
              Female
            </button>
          </div>
        </div>
      </div>

      {/* Optional fields section */}
      <div className="space-y-4">
        <p className="label-mono text-muted">Optional</p>

        {/* Instagram */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Instagram className="w-5 h-5 text-muted" />
          </div>
          <Input
            value={formData.instagram_handle}
            onChange={(e) => handleChange("instagram_handle", e.target.value.replace("@", ""))}
            placeholder="Instagram username"
            className="pl-10 py-4 text-base"
            autoComplete="off"
            autoCapitalize="off"
          />
        </div>

        {/* WhatsApp */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <MessageCircle className="w-5 h-5 text-muted" />
          </div>
          <Input
            value={formData.whatsapp}
            onChange={(e) => handleChange("whatsapp", e.target.value)}
            onBlur={() => handleBlur("whatsapp")}
            placeholder="WhatsApp (e.g. +1234567890)"
            className="pl-10 py-4 text-base"
            error={touched.has("whatsapp") ? fieldErrors.whatsapp : undefined}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </div>

      {/* Submit button - large, prominent */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isLoading}
        loading={isLoading}
        className="w-full py-4 text-sm"
      >
        {isLoading ? "Joining..." : "Join Table Party"}
      </Button>

      {/* Privacy note */}
      <p className="text-xs text-muted text-center px-4">
        Your info is shared with the host and venue for this event only.
      </p>
    </form>
  );
}
