"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Modal, InlineSpinner } from "@crowdstack/ui";
import { Users, DollarSign, CheckCircle, AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";

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
  has_confirmed_booking: boolean;
  zone: {
    id: string;
    name: string;
  };
}

interface TableBookingSectionProps {
  eventId: string;
  eventName: string;
  refCode?: string | null;
  linkCode?: string | null;
}

interface BookingFormData {
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size: number;
  special_requests: string;
}

export function TableBookingSection({ eventId, eventName, refCode, linkCode }: TableBookingSectionProps) {
  const [zones, setZones] = useState<TableZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Booking modal state
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    guest_name: "",
    guest_email: "",
    guest_whatsapp: "",
    party_size: 2,
    special_requests: "",
  });
  const [bookingErrors, setBookingErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Expanded zones state
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAvailableTables();
  }, [eventId, refCode, linkCode]);

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
    setSelectedTable(table);
    setBookingFormData({
      guest_name: "",
      guest_email: "",
      guest_whatsapp: "",
      party_size: Math.min(2, table.capacity),
      special_requests: "",
    });
    setBookingErrors({});
    setBookingSuccess(false);
    setBookingResult(null);
    setShowBookingModal(true);
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

    if (selectedTable && (bookingFormData.party_size < 1 || bookingFormData.party_size > selectedTable.capacity)) {
      errors.party_size = `Party size must be between 1 and ${selectedTable.capacity}`;
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
        <p className="mt-2 text-sm text-gray-400">Loading tables...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!bookingEnabled) {
    if (message) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">{message}</p>
        </div>
      );
    }
    return null;
  }

  if (zones.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No tables available for this event.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold text-white mb-4">Reserve a Table</h2>
      <p className="text-sm text-gray-400 mb-6">
        Select a table to make a reservation request. Our team will contact you to confirm.
      </p>

      <div className="space-y-4">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-gray-800/50 rounded-lg overflow-hidden">
            {/* Zone Header */}
            <button
              onClick={() => toggleZone(zone.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/50 transition-colors"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{zone.name}</h3>
                {zone.description && (
                  <p className="text-sm text-gray-400">{zone.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {zone.tables.length} table{zone.tables.length !== 1 ? "s" : ""} available
                </p>
              </div>
              {expandedZones.has(zone.id) ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
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
                  <div className="p-4 pt-0 grid gap-3 sm:grid-cols-2">
                    {zone.tables.map((table) => (
                      <div
                        key={table.id}
                        className={`relative p-4 rounded-lg border transition-all ${
                          table.has_confirmed_booking
                            ? "bg-gray-900/50 border-gray-700 opacity-60"
                            : "bg-gray-900/80 border-gray-700 hover:border-purple-500/50 cursor-pointer"
                        }`}
                        onClick={() => !table.has_confirmed_booking && handleSelectTable(table)}
                      >
                        {table.has_confirmed_booking && (
                          <div className="absolute top-2 right-2">
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                              Reserved
                            </span>
                          </div>
                        )}

                        <h4 className="font-medium text-white">{table.name}</h4>

                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Up to {table.capacity}
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
                          <p className="mt-2 text-xs text-purple-400">
                            {currencySymbol}
                            {table.effective_deposit.toLocaleString()} deposit required
                          </p>
                        )}

                        {table.notes && (
                          <p className="mt-2 text-xs text-gray-500">{table.notes}</p>
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

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={bookingSuccess ? "Booking Request Submitted" : `Reserve ${selectedTable?.name}`}
      >
        {bookingSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Request Received!</h3>
            <p className="text-gray-400 mb-4">{bookingResult?.message}</p>
            <div className="bg-gray-800 rounded-lg p-4 text-left mb-4">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Table:</strong> {selectedTable?.name}
              </p>
              <p className="text-sm text-gray-400">
                <strong className="text-white">Party Size:</strong> {bookingFormData.party_size}
              </p>
              {selectedTable?.effective_minimum_spend && (
                <p className="text-sm text-gray-400">
                  <strong className="text-white">Minimum Spend:</strong> {currencySymbol}
                  {selectedTable.effective_minimum_spend.toLocaleString()}
                </p>
              )}
              {selectedTable?.effective_deposit && (
                <p className="text-sm text-gray-400">
                  <strong className="text-white">Deposit:</strong> {currencySymbol}
                  {selectedTable.effective_deposit.toLocaleString()}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              A confirmation email has been sent to {bookingFormData.guest_email}
            </p>
            <Button onClick={() => setShowBookingModal(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedTable && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="font-medium text-white">{selectedTable.name}</p>
                <p className="text-sm text-gray-400">
                  {selectedTable.zone.name} • Up to {selectedTable.capacity} guests
                </p>
                {selectedTable.effective_minimum_spend && (
                  <p className="text-sm text-purple-400 mt-1">
                    Minimum spend: {currencySymbol}
                    {selectedTable.effective_minimum_spend.toLocaleString()}
                  </p>
                )}
                {selectedTable.effective_deposit && (
                  <p className="text-sm text-yellow-400 mt-1">
                    Deposit required: {currencySymbol}
                    {selectedTable.effective_deposit.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <Input
              label="Full Name *"
              placeholder="Your full name"
              value={bookingFormData.guest_name}
              onChange={(e) => setBookingFormData({ ...bookingFormData, guest_name: e.target.value })}
              error={bookingErrors.guest_name}
            />

            <Input
              label="Email *"
              type="email"
              placeholder="your@email.com"
              value={bookingFormData.guest_email}
              onChange={(e) => setBookingFormData({ ...bookingFormData, guest_email: e.target.value })}
              error={bookingErrors.guest_email}
            />

            <Input
              label="WhatsApp Number *"
              placeholder="+1 555 123 4567"
              value={bookingFormData.guest_whatsapp}
              onChange={(e) => setBookingFormData({ ...bookingFormData, guest_whatsapp: e.target.value })}
              error={bookingErrors.guest_whatsapp}
              helperText="We'll contact you on WhatsApp to confirm your booking"
            />

            <Input
              label="Party Size"
              type="number"
              min={1}
              max={selectedTable?.capacity || 10}
              value={bookingFormData.party_size}
              onChange={(e) => setBookingFormData({ ...bookingFormData, party_size: parseInt(e.target.value) || 1 })}
              error={bookingErrors.party_size}
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Any special requests or notes..."
                value={bookingFormData.special_requests}
                onChange={(e) => setBookingFormData({ ...bookingFormData, special_requests: e.target.value })}
              />
            </div>

            {selectedTable?.effective_deposit && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  <strong>Deposit Required:</strong> A deposit of {currencySymbol}
                  {selectedTable.effective_deposit.toLocaleString()} is required to confirm your booking.
                  Our team will contact you with payment instructions.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
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
          </div>
        )}
      </Modal>
    </div>
  );
}
