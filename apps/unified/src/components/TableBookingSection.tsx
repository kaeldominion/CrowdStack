"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Modal, InlineSpinner } from "@crowdstack/ui";
import { Users, DollarSign, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X, User, LogIn, Calendar, Instagram, CreditCard, Clock, ExternalLink } from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";

interface UserProfile {
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | null;
  instagram_handle: string | null;
}

interface ProfileFormData {
  whatsapp: string;
  date_of_birth: string;
  gender: "male" | "female" | "";
  instagram_handle: string;
}

interface TableZone {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  tables: TableInfo[];
}

interface TableInfo {
  id: string;
  name: string;
  capacity: number;
  notes: string | null;
  effective_minimum_spend: number | null;
  effective_deposit: number | null;
  effective_capacity: number;
  has_confirmed_booking: boolean;
  zone: {
    id: string;
    name: string;
  };
}

interface TableBookingSectionProps {
  eventId: string;
  eventName: string;
  venueName?: string;
  eventStartTime?: string;
  refCode?: string | null;
  linkCode?: string | null;
}

interface BookingFormData {
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  special_requests: string;
}

export function TableBookingSection({ eventId, eventName, venueName, eventStartTime, refCode, linkCode }: TableBookingSectionProps) {
  const [zones, setZones] = useState<TableZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // User profile for pre-filling form
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [profileComplete, setProfileComplete] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [attendeeId, setAttendeeId] = useState<string | null>(null);

  // Booking modal state
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    guest_name: "",
    guest_email: "",
    guest_whatsapp: "",
    special_requests: "",
  });
  const [bookingErrors, setBookingErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Expanded zones state
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  // Login prompt state
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Profile completion modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    whatsapp: "",
    date_of_birth: "",
    gender: "",
    instagram_handle: "",
  });
  const [profileFormErrors, setProfileFormErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchAvailableTables();
  }, [eventId, refCode, linkCode]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.profile && data.profile.email) {
          setUserProfile({
            name: data.profile.name || data.profile.full_name || "",
            email: data.profile.email || "",
            phone: data.profile.phone || "",
            whatsapp: data.profile.whatsapp || "",
            date_of_birth: data.profile.date_of_birth || null,
            gender: data.profile.gender || null,
            instagram_handle: data.profile.instagram_handle || "",
          });
          setIsLoggedIn(true);
          setProfileComplete(data.profileComplete || false);
          setMissingFields(data.missingFields || []);
          setAttendeeId(data.attendeeId || null);

          // Pre-fill profile form with existing data
          setProfileFormData({
            whatsapp: data.profile.whatsapp || "",
            date_of_birth: data.profile.date_of_birth || "",
            gender: data.profile.gender || "",
            instagram_handle: data.profile.instagram_handle || "",
          });
        } else {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const fetchAvailableTables = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (refCode) params.set("ref", refCode);
      if (linkCode) params.set("code", linkCode);

      const url = `/api/events/${eventId}/tables/available${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tables");
      }

      setZones(data.zones || []);
      setCurrency(data.currency || "USD");
      setBookingEnabled(data.bookingEnabled);
      setMessage(data.message || null);

      // Expand all zones by default if there are few
      if (data.zones && data.zones.length <= 3) {
        setExpandedZones(new Set(data.zones.map((z: TableZone) => z.id)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleZone = (zoneId: string) => {
    setExpandedZones((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(zoneId)) {
        newSet.delete(zoneId);
      } else {
        newSet.add(zoneId);
      }
      return newSet;
    });
  };

  const handleSelectTable = (table: TableInfo) => {
    // Require login before booking
    if (!isLoggedIn) {
      setSelectedTable(table);
      setShowLoginPrompt(true);
      return;
    }

    // Require complete profile before booking
    if (!profileComplete) {
      setSelectedTable(table);
      setShowProfileModal(true);
      return;
    }

    setSelectedTable(table);
    // Pre-fill from user profile
    setBookingFormData({
      guest_name: userProfile?.name || "",
      guest_email: userProfile?.email || "",
      guest_whatsapp: userProfile?.whatsapp || userProfile?.phone || "",
      special_requests: "",
    });
    setBookingErrors({});
    setBookingSuccess(false);
    setBookingResult(null);
    setShowBookingModal(true);
  };

  const handleLoginRedirect = () => {
    // Store the current URL so we can return after login
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  };

  const validateProfileForm = (): boolean => {
    const errors: Partial<Record<keyof ProfileFormData, string>> = {};

    if (!profileFormData.whatsapp.trim()) {
      errors.whatsapp = "WhatsApp number is required";
    }

    if (!profileFormData.date_of_birth) {
      errors.date_of_birth = "Date of birth is required";
    } else {
      // Validate age (must be at least 18)
      const dob = new Date(profileFormData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18) {
        errors.date_of_birth = "You must be at least 18 years old";
      }
    }

    if (!profileFormData.gender) {
      errors.gender = "Please select your gender";
    }

    if (!profileFormData.instagram_handle.trim()) {
      errors.instagram_handle = "Instagram handle is required";
    }

    setProfileFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    try {
      setSavingProfile(true);
      setProfileFormErrors({});

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp: profileFormData.whatsapp,
          date_of_birth: profileFormData.date_of_birth,
          gender: profileFormData.gender,
          instagram_handle: profileFormData.instagram_handle.replace("@", ""),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Refresh profile data and proceed to booking
      await fetchUserProfile();
      setShowProfileModal(false);

      // Now open the booking modal if profile is complete
      if (selectedTable) {
        setBookingFormData({
          guest_name: userProfile?.name || "",
          guest_email: userProfile?.email || "",
          guest_whatsapp: profileFormData.whatsapp,
          special_requests: "",
        });
        setBookingErrors({});
        setBookingSuccess(false);
        setBookingResult(null);
        setShowBookingModal(true);
      }
    } catch (err: any) {
      setProfileFormErrors({ whatsapp: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const getMissingFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      whatsapp: "WhatsApp Number",
      date_of_birth: "Date of Birth",
      gender: "Gender",
      instagram_handle: "Instagram Handle",
    };
    return labels[field] || field;
  };

  const validateBookingForm = (): boolean => {
    const errors: Partial<Record<keyof BookingFormData, string>> = {};

    if (!bookingFormData.guest_name.trim()) {
      errors.guest_name = "Name is required";
    }

    if (!bookingFormData.guest_email.trim()) {
      errors.guest_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingFormData.guest_email)) {
      errors.guest_email = "Invalid email format";
    }

    if (!bookingFormData.guest_whatsapp.trim()) {
      errors.guest_whatsapp = "WhatsApp number is required";
    }

    setBookingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitBooking = async () => {
    if (!selectedTable || !validateBookingForm()) return;

    try {
      setSubmitting(true);
      setBookingErrors({});

      const params = new URLSearchParams();
      if (refCode) params.set("ref", refCode);
      if (linkCode) params.set("code", linkCode);

      const response = await fetch(
        `/api/events/${eventId}/tables/book${params.toString() ? `?${params.toString()}` : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_id: selectedTable.id,
            ...bookingFormData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking");
      }

      setBookingSuccess(true);
      setBookingResult(data);
    } catch (err: any) {
      setBookingErrors({ guest_name: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <InlineSpinner className="mx-auto" />
        <p className="mt-2 text-sm text-muted">Loading tables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-accent-error" />
        <p className="mt-2 text-sm text-accent-error">{error}</p>
      </div>
    );
  }

  if (!bookingEnabled) {
    if (message) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-muted">{message}</p>
        </div>
      );
    }
    return null;
  }

  if (zones.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted">No tables available for this event.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-accent-secondary mb-4">
        Reserve a Table
      </h2>
      <p className="text-sm text-secondary mb-6">
        Select a table to make a reservation request. Our team will contact you to confirm.
      </p>

      <div className="space-y-3">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            {/* Zone Header */}
            <button
              onClick={() => toggleZone(zone.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-raised)] transition-colors"
            >
              <div>
                <h3 className="text-base font-semibold text-primary">{zone.name}</h3>
                {zone.description && (
                  <p className="text-sm text-secondary">{zone.description}</p>
                )}
                <p className="text-xs text-muted mt-1">
                  {zone.tables.length} table{zone.tables.length !== 1 ? "s" : ""} available
                </p>
              </div>
              {expandedZones.has(zone.id) ? (
                <ChevronUp className="h-5 w-5 text-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted" />
              )}
            </button>

            {/* Tables Grid */}
            <AnimatePresence>
              {expandedZones.has(zone.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 grid gap-3">
                    {zone.tables.map((table) => (
                      <div
                        key={table.id}
                        className={`relative p-4 rounded-lg border transition-all ${
                          table.has_confirmed_booking
                            ? "bg-[var(--bg-void)] border-[var(--border-subtle)] opacity-60"
                            : "bg-[var(--bg-raised)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 cursor-pointer"
                        }`}
                        onClick={() => !table.has_confirmed_booking && handleSelectTable(table)}
                      >
                        {table.has_confirmed_booking && (
                          <div className="absolute top-2 right-2">
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
                              Reserved
                            </span>
                          </div>
                        )}

                        <h4 className="font-medium text-primary">{table.name}</h4>

                        <div className="mt-2 flex items-center gap-4 text-sm text-secondary">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {table.effective_capacity} guests
                          </span>
                          {table.effective_minimum_spend && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              Min {currencySymbol}
                              {table.effective_minimum_spend.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {table.effective_deposit && (
                          <p className="mt-2 text-xs text-accent-primary">
                            {currencySymbol}
                            {table.effective_deposit.toLocaleString()} deposit required
                          </p>
                        )}

                        {table.notes && (
                          <p className="mt-2 text-xs text-muted">{table.notes}</p>
                        )}

                        {!table.has_confirmed_booking && (
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            onClick={(e) => {
                              e?.stopPropagation();
                              handleSelectTable(table);
                            }}
                          >
                            Request This Table
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Login Prompt Modal */}
      <Modal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        title="Sign In Required"
      >
        <div className="text-center py-6">
          <div className="mx-auto w-16 h-16 bg-[var(--accent-primary)]/20 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-accent-primary" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">Sign in to Book a Table</h3>
          <p className="text-secondary mb-6">
            Create an account or sign in to request table reservations. Your contact details will be saved for faster bookings.
          </p>
          {selectedTable && (
            <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-secondary">
                <strong className="text-primary">Selected Table:</strong> {selectedTable.name}
              </p>
              <p className="text-sm text-secondary">
                <strong className="text-primary">Zone:</strong> {selectedTable.zone.name}
              </p>
              <p className="text-sm text-secondary">
                <strong className="text-primary">Capacity:</strong> {selectedTable.effective_capacity} guests
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowLoginPrompt(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleLoginRedirect}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </div>
          <p className="text-xs text-muted mt-4">
            Don't have an account? You can create one during sign in.
          </p>
        </div>
      </Modal>

      {/* Profile Completion Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Complete Your Profile"
      >
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 bg-[var(--accent-primary)]/20 rounded-full flex items-center justify-center mb-3">
              <User className="h-6 w-6 text-accent-primary" />
            </div>
            <p className="text-secondary text-sm">
              Please complete your profile to book a table. This information helps us serve you better.
            </p>
          </div>

          {missingFields.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-400">
                <strong>Required fields:</strong> {missingFields.map(getMissingFieldLabel).join(", ")}
              </p>
            </div>
          )}

          <Input
            label="WhatsApp Number *"
            placeholder="+62 812 3456 7890"
            value={profileFormData.whatsapp}
            onChange={(e) => setProfileFormData({ ...profileFormData, whatsapp: e.target.value })}
            error={profileFormErrors.whatsapp}
            helperText="We'll contact you via WhatsApp"
          />

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              value={profileFormData.date_of_birth}
              onChange={(e) => setProfileFormData({ ...profileFormData, date_of_birth: e.target.value })}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
            />
            {profileFormErrors.date_of_birth && (
              <p className="mt-1 text-sm text-accent-error">{profileFormErrors.date_of_birth}</p>
            )}
            <p className="mt-1 text-xs text-muted">You must be at least 18 years old</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Gender *
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setProfileFormData({ ...profileFormData, gender: "male" })}
                className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                  profileFormData.gender === "male"
                    ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-accent-primary"
                    : "bg-[var(--bg-raised)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-default)]"
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setProfileFormData({ ...profileFormData, gender: "female" })}
                className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                  profileFormData.gender === "female"
                    ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-accent-primary"
                    : "bg-[var(--bg-raised)] border-[var(--border-subtle)] text-secondary hover:border-[var(--border-default)]"
                }`}
              >
                Female
              </button>
            </div>
            {profileFormErrors.gender && (
              <p className="mt-1 text-sm text-accent-error">{profileFormErrors.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Instagram Handle *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
              <input
                type="text"
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg text-primary placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                placeholder="yourhandle"
                value={profileFormData.instagram_handle.replace("@", "")}
                onChange={(e) => setProfileFormData({ ...profileFormData, instagram_handle: e.target.value.replace("@", "") })}
              />
            </div>
            {profileFormErrors.instagram_handle && (
              <p className="mt-1 text-sm text-accent-error">{profileFormErrors.instagram_handle}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowProfileModal(false)}
              disabled={savingProfile}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? <InlineSpinner /> : "Save & Continue"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={bookingSuccess ? "Booking Request Submitted" : "Table Reservation"}
        footer={
          !bookingSuccess ? (
            <div className="flex gap-3 w-full">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowBookingModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitBooking}
                disabled={submitting}
              >
                {submitting ? <InlineSpinner /> : "Submit Request"}
              </Button>
            </div>
          ) : undefined
        }
      >
        {bookingSuccess ? (
          <div className="py-4">
            <div className="text-center mb-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">Request Received!</h3>
            </div>

            {/* Booking Details */}
            <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-4 text-left mb-4">
              {venueName && (
                <p className="text-sm text-secondary">
                  <strong className="text-primary">Venue:</strong> {venueName}
                </p>
              )}
              {eventStartTime && (
                <p className="text-sm text-secondary">
                  <strong className="text-primary">Date:</strong> {new Date(eventStartTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
              <p className="text-sm text-secondary">
                <strong className="text-primary">Table:</strong> {selectedTable?.name}
              </p>
              <p className="text-sm text-secondary">
                <strong className="text-primary">Max Guests:</strong> {selectedTable?.effective_capacity}
              </p>
              {selectedTable?.effective_minimum_spend && (
                <p className="text-sm text-secondary">
                  <strong className="text-primary">Minimum Spend:</strong> {currencySymbol}
                  {selectedTable.effective_minimum_spend.toLocaleString()}
                </p>
              )}
            </div>

            {/* Payment Section - Show prominently if deposit required */}
            {bookingResult?.booking?.deposit_required && bookingResult?.payment?.payment_url ? (
              <div className="bg-[var(--accent-primary)]/10 rounded-xl border border-[var(--accent-primary)]/30 p-5 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[var(--accent-primary)]/20">
                    <CreditCard className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">Pay Deposit to Confirm</h4>
                    <p className="text-xs text-secondary">Complete your booking now</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-secondary">Amount Due</span>
                  <span className="text-2xl font-bold text-primary">
                    {currencySymbol}{bookingResult.booking.deposit_required.toLocaleString()}
                  </span>
                </div>

                {bookingResult.payment.expires_at && (
                  <div className="flex items-center gap-2 text-xs text-muted mb-4">
                    <Clock className="h-3 w-3" />
                    <span>
                      Payment link expires: {new Date(bookingResult.payment.expires_at).toLocaleString()}
                    </span>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => window.location.href = bookingResult.payment.payment_url}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>

                <p className="mt-3 text-xs text-muted text-center">
                  You'll be redirected to our secure payment page
                </p>
              </div>
            ) : bookingResult?.booking?.deposit_required ? (
              /* Deposit required but DOKU not available - show booking URL */
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-amber-400">Deposit Required</span>
                </div>
                <p className="text-sm text-secondary mb-3">
                  {currencySymbol}{bookingResult.booking.deposit_required.toLocaleString()} deposit required to confirm your booking.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.location.href = bookingResult.booking.booking_url}
                >
                  View Booking & Pay
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-muted text-center mb-4">
              A confirmation email has been sent to {bookingFormData.guest_email}
            </p>

            {bookingResult?.booking?.deposit_required ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowBookingModal(false)}
              >
                Pay Later
              </Button>
            ) : (
              <Button className="w-full" onClick={() => setShowBookingModal(false)}>
                Done
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event & Table Info Header */}
            <div className="bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg p-4">
              {venueName && (
                <p className="font-semibold text-primary text-lg">{venueName}</p>
              )}
              {eventStartTime && (
                <div className="flex items-center gap-2 text-sm text-secondary mt-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(eventStartTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {selectedTable && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <p className="font-medium text-primary">{selectedTable.name}</p>
                  <p className="text-sm text-secondary">
                    {selectedTable.zone.name} • {selectedTable.effective_capacity} guests
                  </p>
                  {selectedTable.effective_minimum_spend && (
                    <p className="text-sm text-accent-primary mt-1">
                      Minimum spend: {currencySymbol}
                      {selectedTable.effective_minimum_spend.toLocaleString()}
                    </p>
                  )}
                  {selectedTable.effective_deposit && (
                    <p className="text-sm text-amber-400 mt-1">
                      Deposit required: {currencySymbol}
                      {selectedTable.effective_deposit.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* User profile info - read-only since user is logged in */}
            <div className="bg-[var(--bg-glass)] rounded-lg p-4 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-accent-primary" />
                <span className="text-sm font-medium text-accent-primary">Your Details</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-muted mb-1">Name</label>
                  <p className="text-primary">{bookingFormData.guest_name}</p>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Email</label>
                  <p className="text-primary">{bookingFormData.guest_email}</p>
                </div>
              </div>
            </div>

            <Input
              label="WhatsApp Number *"
              placeholder="+1 555 123 4567"
              value={bookingFormData.guest_whatsapp}
              onChange={(e) => setBookingFormData({ ...bookingFormData, guest_whatsapp: e.target.value })}
              error={bookingErrors.guest_whatsapp}
              helperText="We'll contact you on WhatsApp to confirm your booking"
            />

            {/* Table capacity info - shown instead of party size input */}
            <div className="bg-[var(--bg-glass)] rounded-lg p-3 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-secondary">
                <Users className="h-4 w-4" />
                <span className="text-sm">
                  This table accommodates up to <strong className="text-primary">{selectedTable?.effective_capacity} guests</strong>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg text-primary placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent resize-none"
                rows={3}
                placeholder="Any special requests or notes..."
                value={bookingFormData.special_requests}
                onChange={(e) => setBookingFormData({ ...bookingFormData, special_requests: e.target.value })}
              />
            </div>

            {selectedTable?.effective_deposit && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm text-amber-400">
                  <strong>Deposit Required:</strong> A deposit of {currencySymbol}
                  {selectedTable.effective_deposit.toLocaleString()} is required to confirm your booking.
                  Our team will contact you with payment instructions.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
