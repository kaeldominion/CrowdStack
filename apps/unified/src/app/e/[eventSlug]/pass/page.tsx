"use client";

/**
 * QR PASS PAGE
 * 
 * Displays the user's entry pass for an event.
 * Uses design system tokens and patterns.
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { X, CheckCircle2, QrCode, Scan, Maximize2 } from "lucide-react";
import Link from "next/link";
import { Logo, LoadingSpinner, Button, Card, ConfirmModal } from "@crowdstack/ui";
import { DockNav } from "@/components/navigation/DockNav";
import { motion, AnimatePresence } from "framer-motion";

interface PassData {
  qrToken: string;
  eventName: string;
  eventDate: string;
  venueName: string;
  attendeeName: string;
  passId: string;
  flierUrl?: string;
}

export default function QRPassPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventSlug = params.eventSlug as string;
  const tokenFromQuery = searchParams.get("token");
  
  const [passData, setPassData] = useState<PassData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeregistering, setIsDeregistering] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deregisterError, setDeregisterError] = useState<string | null>(null);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

  // Format date for display
  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Generate short pass ID from token
  const generatePassId = (token: string) => {
    if (!token) return "--------";
    const hash = token.replace(/-/g, "").substring(0, 12).toUpperCase();
    return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
  };

  // Fetch registration and QR token
  useEffect(() => {
    const loadPassData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let token = tokenFromQuery;
        let eventDetails = { name: "", venue: "", date: "", attendee: "", flier: "" };
        
        // If we have a token in URL, validate it first to get all details
        if (tokenFromQuery) {
          const validateResponse = await fetch("/api/pass/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: tokenFromQuery }),
          });
          
          if (validateResponse.ok) {
            const validData = await validateResponse.json();
            if (validData.valid) {
              eventDetails.name = validData.event?.name || "";
              eventDetails.venue = validData.event?.venue?.name || "";
              eventDetails.date = validData.event?.start_time || "";
              eventDetails.flier = validData.event?.flier_url || "";
              eventDetails.attendee = validData.attendee?.name || "Guest";
            }
          }
        }
        
        // Also try check-registration for logged-in users (to get fresh token if needed)
        const response = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
        if (response.ok) {
          const data = await response.json();
          
          if (!data.registered && !tokenFromQuery) {
            setError("You are not registered for this event");
            setLoading(false);
            return;
          }
          
          if (data.event) {
            if (!eventDetails.name) eventDetails.name = data.event.name || "";
            if (!eventDetails.venue) eventDetails.venue = data.event.venue?.name || "";
            if (!eventDetails.date) eventDetails.date = data.event.start_time || "";
            if (!eventDetails.flier) eventDetails.flier = data.event.flier_url || data.event.cover_image_url || "";
          }
          
          if (data.attendee && !eventDetails.attendee) {
            eventDetails.attendee = data.attendee.name || "Guest";
          }
          
          if (data.qr_pass_token && !token) {
            token = data.qr_pass_token;
          }
        }
        
        // Always fetch full event details to get flier, venue, etc.
        const eventResponse = await fetch(`/api/events/by-slug/${eventSlug}`);
        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          if (!eventDetails.name) eventDetails.name = eventData.name || "";
          if (!eventDetails.venue) eventDetails.venue = eventData.venue?.name || "";
          if (!eventDetails.date) eventDetails.date = eventData.start_time || "";
          // Always get flier from this endpoint as it's more reliable
          eventDetails.flier = eventData.flier_url || eventData.cover_image_url || eventDetails.flier || "";
        }
        
        if (token) {
          // Generate QR code URL
          const qrData = encodeURIComponent(token);
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
          setQrCodeUrl(qrUrl);
          
          setPassData({
            qrToken: token,
            eventName: eventDetails.name,
            eventDate: eventDetails.date,
            venueName: eventDetails.venue,
            attendeeName: eventDetails.attendee || "Guest",
            passId: generatePassId(token),
            flierUrl: eventDetails.flier,
          });
          
          // Update URL to include token for sharing/bookmarking
          if (typeof window !== "undefined" && !tokenFromQuery) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("token", token);
            window.history.replaceState({}, "", newUrl.toString());
          }
        } else {
          setError("QR pass token not available");
        }
      } catch (err: any) {
        console.error("Error loading pass data:", err);
        setError(err.message || "Failed to load pass");
      } finally {
        setLoading(false);
      }
    };
    
    if (eventSlug) {
      loadPassData();
    }
  }, [eventSlug, tokenFromQuery]);

  async function handleDeregister() {
    setIsDeregistering(true);
    setDeregisterError(null);
    try {
      const response = await fetch(`/api/events/by-slug/${eventSlug}/deregister`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deregister");
      }

      setShowCancelModal(false);
      router.push(`/e/${eventSlug}`);
    } catch (err: any) {
      console.error("Error deregistering:", err);
      setDeregisterError(err.message || "Failed to deregister. Please try again.");
      setIsDeregistering(false);
    }
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Navigation Bar */}
      <DockNav />
      
      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <Link
          href={`/e/${eventSlug}`}
          className="w-10 h-10 rounded-full bg-glass/80 border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:bg-active transition-colors"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-secondary">Loading your pass...</p>
          </div>
        ) : error ? (
          <Card className="max-w-sm w-full !p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-accent-error/20 flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-accent-error" />
            </div>
            <h2 className="font-sans text-xl font-bold text-primary mb-2">{error}</h2>
            <p className="text-sm text-secondary mb-6">
              Please register for this event to get your entry pass.
            </p>
            <Button href={`/e/${eventSlug}/register`} variant="primary" className="w-full">
              Register Now
            </Button>
          </Card>
        ) : passData && qrCodeUrl ? (
          <>
            {/* Logo Badge */}
            <div className="mb-6">
              <div className="w-24 h-24 rounded-2xl bg-void border-2 border-accent-primary/50 flex items-center justify-center shadow-lg shadow-accent-primary/20">
                <Logo variant="tricolor" size="xl" iconOnly />
              </div>
            </div>

            {/* Event Info */}
            <div className="text-center mb-8">
              <h1 className="font-sans text-3xl font-black text-primary uppercase tracking-tight">
                {passData.eventName || "Event"}
              </h1>
              <p className="font-mono text-sm font-medium text-accent-secondary tracking-wide mt-2">
                {formatEventDate(passData.eventDate)}
                {passData.venueName && ` • ${passData.venueName.toUpperCase()}`}
              </p>
            </div>

            {/* Pass Card */}
            <div className="w-full max-w-sm">
              {/* Gradient top border */}
              <div className="h-1 rounded-t-2xl bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary" />
              
              {/* Card */}
              <div className="rounded-b-2xl border border-border-subtle border-t-0 bg-glass">
                {/* Guest & Status */}
                <div className="flex items-start justify-between p-5 border-b border-border-subtle/50">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-primary mb-1">
                      Guest
                    </p>
                    <p className="font-sans text-xl font-bold text-primary">
                      {passData.attendeeName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-1.5 text-accent-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-sans text-base font-bold">Confirmed</span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="p-6 flex flex-col items-center">
                  <div 
                    className="bg-white p-3 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow relative group"
                    onClick={() => setShowFullscreenQR(true)}
                  >
                    <img 
                      src={qrCodeUrl} 
                      alt="Event QR Pass" 
                      className="w-52 h-52"
                      style={{ imageRendering: "pixelated" }}
                    />
                    {/* Tap hint overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 rounded-xl transition-colors">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-primary">
                        <Maximize2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Tap to enlarge</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pass ID */}
                  <p className="mt-5 font-mono text-xs text-muted tracking-wider">
                    ID: {passData.passId}
                  </p>
                  <p className="mt-2 text-xs text-secondary text-center">
                    Tap QR code to view full screen
                  </p>
                </div>
              </div>
            </div>

            {/* Scan Instruction */}
            <div className="mt-8 flex items-center gap-2 text-muted">
              <Scan className="h-4 w-4" />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest">
                Scan at door for entry
              </p>
            </div>

            {/* Deregister Button */}
            <div className="mt-8 w-full max-w-sm">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isDeregistering}
                className="w-full py-3 rounded-xl text-sm font-medium text-accent-error hover:bg-accent-error/10 transition-colors disabled:opacity-50"
              >
                Cancel Registration
              </button>
            </div>
          </>
        ) : null}
      </div>

      {/* Fullscreen QR Code Modal */}
      <AnimatePresence>
        {showFullscreenQR && qrCodeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setShowFullscreenQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowFullscreenQR(false)}
                className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* QR Code Container */}
              <div className="bg-white p-8 rounded-2xl shadow-2xl">
                <div className="flex flex-col items-center">
                  <img 
                    src={qrCodeUrl.replace('size=300x300', 'size=600x600')} 
                    alt="Event QR Pass" 
                    className="w-full max-w-md h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />
                  
                  {/* Event Info */}
                  {passData && (
                    <div className="mt-6 text-center">
                      <p className="font-sans text-lg font-bold text-primary mb-1">
                        {passData.eventName}
                      </p>
                      <p className="font-mono text-xs text-muted tracking-wider">
                        ID: {passData.passId}
                      </p>
                      <p className="mt-2 text-sm text-secondary">
                        {passData.attendeeName}
                      </p>
                    </div>
                  )}
                  
                  {/* Instruction */}
                  <div className="mt-4 flex items-center gap-2 text-muted">
                    <Scan className="h-4 w-4" />
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest">
                      Scan at door for entry
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tap to close hint */}
              <p className="mt-4 text-center text-white/60 text-sm">
                Tap outside to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Registration Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setDeregisterError(null);
        }}
        onConfirm={handleDeregister}
        title="Cancel Registration?"
        message={
          <>
            Are you sure you want to cancel your registration for{" "}
            <span className="font-semibold text-primary">{passData?.eventName}</span>?
            {deregisterError && (
              <span className="block mt-2 text-accent-error">{deregisterError}</span>
            )}
          </>
        }
        confirmText={isDeregistering ? "Cancelling..." : "Yes, Cancel"}
        cancelText="Keep Registration"
        variant="danger"
        loading={isDeregistering}
      />
    </div>
  );
}
