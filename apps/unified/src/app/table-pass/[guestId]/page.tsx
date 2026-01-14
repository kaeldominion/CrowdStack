"use client";

/**
 * TABLE PARTY PASS PAGE
 *
 * Mobile-optimized QR pass for table party guests.
 * Similar to event pass but branded for table bookings.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { X, CheckCircle2, Scan, Maximize2, Users, Calendar, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, Button } from "@crowdstack/ui";
import { motion, AnimatePresence } from "framer-motion";

interface PassData {
  pass: {
    qr_token: string;
    guest_name: string;
    guest_email: string;
    is_host: boolean;
    checked_in: boolean;
    checked_in_at: string | null;
  };
  booking: {
    id: string;
    host_name: string;
    party_size: number;
    table_name: string;
    zone_name: string;
    status: string;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    date: string;
    time: string;
    start_time: string;
    cover_image: string | null;
    is_past: boolean;
  };
  venue: {
    name: string;
    address: string;
    city: string;
  };
}

export default function TablePassPage() {
  const params = useParams();
  const guestId = params.guestId as string;

  const [passData, setPassData] = useState<PassData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

  // Generate short pass ID from guest ID
  const generatePassId = (id: string) => {
    if (!id) return "--------";
    const hash = id.replace(/-/g, "").substring(0, 12).toUpperCase();
    return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}`;
  };

  useEffect(() => {
    loadPassData();
  }, [guestId]);

  const loadPassData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/table-party/pass/${guestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load pass");
      }

      setPassData(data);

      // Generate QR code URL using the JWT token
      if (data.pass.qr_token) {
        const qrData = encodeURIComponent(data.pass.qr_token);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
        setQrCodeUrl(qrUrl);
      }
    } catch (err: any) {
      console.error("Error loading pass:", err);
      setError(err.message || "Failed to load pass");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
          <p className="text-secondary">Loading your pass...</p>
        </div>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <Card className="max-w-sm w-full !p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-accent-error/20 flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-accent-error" />
          </div>
          <h2 className="font-sans text-xl font-bold text-primary mb-2">
            Pass Not Found
          </h2>
          <p className="text-sm text-secondary mb-6">
            {error || "This pass could not be found."}
          </p>
          <Button href="/" variant="secondary" className="w-full">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex flex-col">
      {/* Close button */}
      <div className="absolute top-3 right-3 z-10">
        <Link
          href={`/e/${passData.event.slug}`}
          className="w-10 h-10 rounded-full bg-glass/80 border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:bg-active transition-colors"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 pt-14">
        {/* Pass Card - contains everything for consistent width */}
        <div className="w-full max-w-sm">
          {/* Event Info - inside card container for consistent width */}
          <div className="text-center mb-4 px-2">
            <h1 className="font-sans text-xl sm:text-2xl font-black text-primary uppercase tracking-tight leading-tight">
              {passData.event.name}
            </h1>
            <p className="font-mono text-sm font-medium text-accent-secondary tracking-wide mt-2">
              {passData.event.date}
            </p>
            {passData.venue.name && (
              <p className="font-mono text-sm font-medium text-secondary tracking-wide mt-1">
                {passData.venue.name.toUpperCase()}
              </p>
            )}
          </div>
          {/* Gradient top border - different colors for table pass */}
          <div className="h-1 rounded-t-2xl bg-gradient-to-r from-accent-secondary via-accent-primary to-accent-secondary" />

          {/* Card */}
          <div className="rounded-b-2xl border border-border-subtle border-t-0 bg-glass">
            {/* Guest & Table Info */}
            <div className="flex items-start justify-between p-5 border-b border-border-subtle/50">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-secondary mb-1">
                  Table Guest
                </p>
                <p className="font-sans text-xl font-bold text-primary">
                  {passData.pass.guest_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {passData.pass.is_host && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-accent-primary/20 text-accent-primary">
                      Host
                    </span>
                  )}
                  {passData.booking.zone_name?.toLowerCase().includes('vip') && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30">
                      VIP
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
                  Status
                </p>
                {passData.pass.checked_in ? (
                  <div className="flex items-center gap-1.5 text-accent-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-sans text-base font-bold">Checked In</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-accent-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-sans text-base font-bold">Confirmed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Table Details */}
            <div className="px-5 py-3 border-b border-border-subtle/50 bg-accent-secondary/5">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-accent-secondary" />
                <span className="text-sm font-medium text-primary">
                  {passData.booking.table_name}
                </span>
                <span className="text-sm text-muted">•</span>
                <span className="text-sm text-secondary">
                  {passData.booking.zone_name}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Hosted by {passData.booking.host_name}
              </p>
            </div>

            {/* QR Code */}
            <div className="p-6 flex flex-col items-center">
              {qrCodeUrl ? (
                <>
                  <div
                    className="bg-white p-3 rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow relative group"
                    onClick={() => setShowFullscreenQR(true)}
                  >
                    <img
                      src={qrCodeUrl}
                      alt="Table Party Pass QR"
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
                    ID: {generatePassId(guestId)}
                  </p>
                  <p className="mt-2 text-xs text-secondary text-center">
                    Tap QR code to view full screen
                  </p>
                </>
              ) : (
                <p className="text-secondary">QR code not available</p>
              )}
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

        {/* Event Details Link */}
        <Link
          href={`/e/${passData.event.slug}`}
          className="mt-6 text-sm text-accent-primary hover:underline"
        >
          View event details
        </Link>
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
                    src={qrCodeUrl.replace("size=300x300", "size=600x600")}
                    alt="Table Party Pass QR"
                    className="w-full max-w-md h-auto"
                    style={{ imageRendering: "pixelated" }}
                  />

                  {/* Info */}
                  <div className="mt-6 text-center">
                    <p className="font-sans text-lg font-bold text-primary mb-1">
                      {passData.event.name}
                    </p>
                    <p className="font-mono text-xs text-muted tracking-wider">
                      ID: {generatePassId(guestId)}
                    </p>
                    <p className="mt-2 text-sm text-secondary">
                      {passData.pass.guest_name} • {passData.booking.table_name}
                    </p>
                  </div>

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
    </div>
  );
}
