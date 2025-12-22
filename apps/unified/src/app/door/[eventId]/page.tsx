"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Modal, Card, Logo, InlineSpinner, LoadingSpinner } from "@crowdstack/ui";
import { 
  QrCode, 
  Search, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Camera,
  CameraOff,
  Download,
  Users,
  Phone,
  Mail,
  Instagram,
  Calendar,
  Clock,
  User,
  X,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CheckInResult {
  id: string;
  name: string;
  status: "success" | "error" | "duplicate" | "banned";
  message: string;
  timestamp: string;
  attendee_id?: string;
  registration_id?: string;
}

interface EventInfo {
  id: string;
  name: string;
  slug: string;
  venue?: { id?: string; name: string };
  flier_url?: string;
}

interface SearchResult {
  registration_id: string;
  attendee_id: string;
  attendee_name: string;
  attendee_email: string | null;
  attendee_phone: string | null;
  checked_in: boolean;
  checked_in_at?: string | null;
}

interface AttendeeProfile {
  id: string;
  name: string;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  registration_id?: string;
  registered_at?: string;
  checked_in?: boolean;
  checked_in_at?: string | null;
}

export default function DoorScannerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  // State
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResult | null>(null);
  const [flashColor, setFlashColor] = useState<"green" | "red" | null>(null);
  const [recentScans, setRecentScans] = useState<CheckInResult[]>([]);
  const [stats, setStats] = useState({ checkedIn: 0, registered: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Camera scanning state
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  // Quick add modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: "", email: "", phone: "" });
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  
  // QR code modal
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Attendee profile modal
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load event info and stats
  useEffect(() => {
    loadEventInfo();
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => {
      clearInterval(interval);
      stopScanning();
    };
  }, [eventId]);

  const loadEventInfo = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventInfo({
          id: data.event.id,
          name: data.event.name,
          slug: data.event.slug,
          venue: data.event.venue,
          flier_url: data.event.flier_url,
        });
      }
    } catch (err) {
      console.error("Error loading event info:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/live-metrics`);
      if (!response.ok) return;
      const data = await response.json();
      setStats({
        checkedIn: data.current_attendance || 0,
        registered: data.total_registrations || 0,
        remaining: data.capacity ? data.capacity - data.current_attendance : (data.total_registrations || 0) - (data.current_attendance || 0),
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  // Search functionality
  const handleSearch = useCallback(async (showAll = false) => {
    setSearching(true);
    try {
      const url = showAll 
        ? `/api/events/${eventId}/search?all=true`
        : `/api/events/${eventId}/search?q=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [eventId, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Check-in functionality
  const handleCheckIn = async (registrationId?: string, qrToken?: string) => {
    console.log("[Door Scanner] Attempting check-in:", { registrationId, qrToken: qrToken ? "provided" : "none" });
    
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          registration_id: registrationId, 
          qr_token: qrToken 
        }),
      });

      const data = await response.json();
      console.log("[Door Scanner] Check-in response:", data);

      if (response.ok && data.success) {
        const result: CheckInResult = {
          id: data.checkin?.id || "",
          name: data.attendee_name || "Attendee",
          status: data.duplicate ? "duplicate" : "success",
          message: data.message || "Checked in successfully",
          timestamp: new Date().toISOString(),
          attendee_id: data.attendee_id,
          registration_id: data.registration_id,
        };
        setLastCheckIn(result);
        setFlashColor(data.duplicate ? null : "green");
        setRecentScans((prev) => [result, ...prev].slice(0, 10));
        if (!data.duplicate) {
          setTimeout(() => setFlashColor(null), 500);
        }
        loadStats();
        
        // Clear search after successful check-in
        setSearchQuery("");
        setSearchResults([]);
      } else {
        const result: CheckInResult = {
          id: "",
          name: data.attendee_name || "Unknown",
          status: data.error?.includes("banned") ? "banned" : "error",
          message: data.error || "Check-in failed",
          timestamp: new Date().toISOString(),
          attendee_id: data.attendee_id,
        };
        setLastCheckIn(result);
        setFlashColor("red");
        setRecentScans((prev) => [result, ...prev].slice(0, 10));
        setTimeout(() => setFlashColor(null), 500);
      }
    } catch (err: any) {
      console.error("[Door Scanner] Check-in error:", err);
      const result: CheckInResult = {
        id: "",
        name: "Unknown",
        status: "error",
        message: err.message || "Check-in failed",
        timestamp: new Date().toISOString(),
      };
      setLastCheckIn(result);
      setFlashColor("red");
      setTimeout(() => setFlashColor(null), 500);
    }
  };

  // QR Scanner using html5-qrcode
  const startScanning = async () => {
    setCameraError(null);
    
    // Set scanning to true FIRST so the container is visible
    setScanning(true);
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      console.log("[Door Scanner] Starting camera...");
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("[Door Scanner] QR code scanned:", decodedText);
          
          // Stop scanning briefly to prevent multiple scans
          scanner.pause(true);
          
          // Process the QR code
          handleCheckIn(undefined, decodedText);
          
          // Resume scanning after 2 seconds
          setTimeout(() => {
            if (scannerRef.current) {
              try {
                scanner.resume();
              } catch (e) {
                console.log("Could not resume scanner");
              }
            }
          }, 2000);
        },
        (errorMessage) => {
          // Ignore scanning errors (no QR found in frame)
        }
      );

      console.log("[Door Scanner] Camera started successfully");
    } catch (err: any) {
      console.error("[Door Scanner] Camera error:", err);
      setCameraError(err.message || "Failed to access camera");
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.log("Error stopping scanner:", e);
      }
    }
    setScanning(false);
  };

  // Load attendee profile
  const loadAttendeeProfile = async (attendeeId: string, registrationId?: string) => {
    setLoadingProfile(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendee/${attendeeId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedAttendee({
          ...data.attendee,
          registration_id: registrationId || data.registration?.id,
          registered_at: data.registration?.registered_at,
          checked_in: data.checkin !== null,
          checked_in_at: data.checkin?.checked_in_at,
        });
      } else {
        console.error("Failed to load attendee profile");
      }
    } catch (err) {
      console.error("Error loading attendee profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Quick add functionality
  const handleQuickAdd = async () => {
    if (!quickAddForm.name.trim()) {
      alert("Name is required");
      return;
    }
    if (!quickAddForm.phone.trim()) {
      alert("Phone is required");
      return;
    }

    setQuickAddLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}/quick-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickAddForm.name.trim(),
          phone: quickAddForm.phone.trim(),
          email: quickAddForm.email.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.checkin) {
        // Quick-add API already creates registration and check-in
        const result: CheckInResult = {
          id: data.checkin.id,
          name: data.attendee.name,
          status: "success",
          message: "Quick added and checked in",
          timestamp: new Date().toISOString(),
        };
        setLastCheckIn(result);
        setFlashColor("green");
        setRecentScans((prev) => [result, ...prev].slice(0, 10));
        setTimeout(() => setFlashColor(null), 500);
        setShowQuickAdd(false);
        setQuickAddForm({ name: "", email: "", phone: "" });
        loadStats();
        setShowQuickAdd(false);
        setQuickAddForm({ name: "", email: "", phone: "" });
      } else {
        alert(data.error || "Failed to add attendee");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add attendee");
    } finally {
      setQuickAddLoading(false);
    }
  };

  const getStatusIcon = (status: CheckInResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "duplicate":
        return <CheckCircle2 className="h-8 w-8 text-yellow-500" />;
      case "banned":
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      default:
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <LoadingSpinner text="Loading event..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] relative">
      {/* Blurred flier background */}
      {eventInfo?.flier_url && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${eventInfo.flier_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(30px)",
              transform: "scale(1.1)",
              opacity: 0.4,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D10]/60 via-[#0B0D10]/70 to-[#0B0D10]/90" />
        </div>
      )}
      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              flashColor === "green" ? "bg-green-500" : "bg-red-500"
            }`}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-md px-4 pb-6">
        {/* Header with Event Info */}
        <div className="mb-6 text-center">
          {eventInfo && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-white">{eventInfo.name}</h1>
                {eventInfo.venue && (
                  <p className="text-sm text-white/60">{eventInfo.venue.name}</p>
                )}
              </div>
              <a
                href={`/e/${eventInfo.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/20 rounded-full transition-all duration-200 backdrop-blur-md"
              >
                <span>View Public Page</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Stats - Glass Cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="p-3 rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-center">
            <p className="text-2xl font-bold text-green-400 font-mono">{stats.checkedIn}</p>
            <p className="text-xs text-white/60">Checked In</p>
          </div>
          <div className="p-3 rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-center">
            <p className="text-2xl font-bold text-white font-mono">{stats.registered}</p>
            <p className="text-xs text-white/60">Registered</p>
          </div>
          <div className="p-3 rounded-xl backdrop-blur-md bg-black/30 border border-white/15 text-center">
            <p className="text-2xl font-bold text-yellow-400 font-mono">{stats.remaining}</p>
            <p className="text-xs text-white/60">Remaining</p>
          </div>
        </div>

        {/* Last check-in status */}
        <AnimatePresence>
          {lastCheckIn && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`mb-6 p-4 rounded-xl backdrop-blur-md border-2 ${
                lastCheckIn.status === "success"
                  ? "border-green-500/50 bg-green-500/20"
                  : lastCheckIn.status === "duplicate"
                  ? "border-yellow-500/50 bg-yellow-500/20"
                  : "border-red-500/50 bg-red-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(lastCheckIn.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-white truncate">{lastCheckIn.name}</p>
                  <p className={`text-sm ${
                    lastCheckIn.status === "success" ? "text-green-400" 
                    : lastCheckIn.status === "duplicate" ? "text-yellow-400"
                    : "text-red-400"
                  }`}>
                    {lastCheckIn.message}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Scanner */}
        <div className="mb-6">
          {/* QR Reader container - always rendered but visibility controlled */}
          <div 
            id="qr-reader" 
            className="rounded-xl overflow-hidden bg-black/50 backdrop-blur-sm border border-white/10"
            style={{ 
              minHeight: scanning ? "300px" : "0",
              display: scanning ? "block" : "none",
            }}
          />
          
          {!scanning ? (
            <Button
              variant="primary"
              size="lg"
              onClick={startScanning}
              className="w-full h-16 text-xl font-bold"
            >
              <Camera className="h-6 w-6 mr-3" />
              Start Camera Scan
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={stopScanning}
              className="w-full h-12 mt-2 backdrop-blur-md bg-black/30 border-white/20 text-white hover:bg-black/40"
            >
              <CameraOff className="h-5 w-5 mr-2" />
              Stop Scanning
            </Button>
          )}

          {cameraError && (
            <div className="mt-2 p-3 rounded-xl backdrop-blur-md bg-red-500/20 border border-red-500/30">
              <p className="text-sm text-red-400">{cameraError}</p>
              <p className="text-xs text-white/60 mt-1">
                Make sure camera permissions are granted and you're using HTTPS.
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="backdrop-blur-md bg-black/30 border-white/20 text-white pr-10 rounded-xl"
              />
              {searching && (
                <InlineSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60" />
              )}
            </div>
            {!searchQuery.trim() && (
              <Button
                variant="secondary"
                onClick={() => handleSearch(true)}
                disabled={searching}
                className="backdrop-blur-md bg-black/30 border-white/20 text-white hover:bg-black/40 rounded-xl"
                title="View all registered attendees"
              >
                <Users className="h-4 w-4 mr-1" />
                All
              </Button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.registration_id}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors backdrop-blur-md ${
                    result.checked_in
                      ? "bg-green-500/20 border-green-500/30 hover:bg-green-500/30"
                      : "bg-black/30 border-white/15 hover:bg-black/40"
                  }`}
                  onClick={() => loadAttendeeProfile(result.attendee_id, result.registration_id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{result.attendee_name}</p>
                    <p className="text-xs text-white/60 truncate">
                      {result.attendee_email || result.attendee_phone || "No contact info"}
                    </p>
                  </div>
                  {result.checked_in ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 ml-2" />
                  ) : (
                    <div 
                      className="flex-shrink-0 ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCheckIn(result.registration_id)}
                      >
                        Check In
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowQuickAdd(true)}
            className="w-full h-14 text-lg font-semibold backdrop-blur-md bg-black/30 border-white/20 text-white hover:bg-black/40 rounded-xl"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Quick Add & Check In
          </Button>
          
          {eventInfo && (
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowQRCode(true)}
                className="w-full h-14 text-lg font-semibold backdrop-blur-md bg-black/30 border-white/20 text-white hover:bg-black/40 rounded-xl"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Show Event QR Code
              </Button>
              
              <a
                href={`/e/${eventInfo.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full h-14 text-lg font-semibold backdrop-blur-md bg-black/30 border-white/20 text-white hover:bg-black/40 rounded-xl"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  View Public Page
                </Button>
              </a>
            </>
          )}
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="backdrop-blur-md bg-black/20 border border-white/10 rounded-xl p-4">
            <p className="text-sm font-medium text-white/60 mb-3">Recent Check-ins ({recentScans.length})</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentScans.map((scan, index) => (
                <motion.div
                  key={`${scan.id}-${scan.timestamp}`}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 - index * 0.08 }}
                  className={`flex items-center gap-2 p-2 rounded-lg bg-white/5 ${
                    scan.attendee_id ? "cursor-pointer hover:bg-white/10" : ""
                  }`}
                  onClick={() => scan.attendee_id && loadAttendeeProfile(scan.attendee_id, scan.registration_id)}
                >
                  {getStatusIcon(scan.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{scan.name}</p>
                  </div>
                  <p className="text-xs text-white/40">
                    {new Date(scan.timestamp).toLocaleTimeString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {eventInfo && (
        <Modal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          title="Event Registration QR Code"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Scan this QR code to register for the event. Registrations will be attributed to the venue.
            </p>
            
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  (() => {
                    const baseUrl = typeof window !== "undefined" 
                      ? `${window.location.origin}/e/${eventInfo.slug}/register`
                      : `/e/${eventInfo.slug}/register`;
                    // Add venue referral if available (venue-owned QR code)
                    if (eventInfo.venue?.id) {
                      return `${baseUrl}?ref=venue_${eventInfo.venue.id}`;
                    }
                    return baseUrl;
                  })()
                )}`}
                alt="Event Registration QR Code"
                className="w-64 h-64"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">Event Registration Link</p>
              <p className="text-xs text-foreground-muted break-all">
                {typeof window !== "undefined" 
                  ? `${window.location.origin}/e/${eventInfo.slug}/register`
                  : `/e/${eventInfo.slug}/register`}
              </p>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowQRCode(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Add Modal */}
      <Modal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        title="Quick Add Attendee"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Add a new attendee and check them in immediately.
          </p>
          
          <Input
            label="Name *"
            value={quickAddForm.name}
            onChange={(e) => setQuickAddForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
          />
          
          <Input
            label="Email"
            type="email"
            value={quickAddForm.email}
            onChange={(e) => setQuickAddForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
          />
          
          <Input
            label="Phone *"
            type="tel"
            value={quickAddForm.phone}
            onChange={(e) => setQuickAddForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+1 555 123 4567"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowQuickAdd(false)}
              disabled={quickAddLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleQuickAdd}
              disabled={quickAddLoading || !quickAddForm.name.trim() || !quickAddForm.phone.trim()}
              loading={quickAddLoading}
            >
              Add & Check In
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attendee Profile Modal */}
      <AnimatePresence>
        {(selectedAttendee || loadingProfile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !loadingProfile && setSelectedAttendee(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {loadingProfile ? (
                <div className="p-8 flex items-center justify-center">
                  <LoadingSpinner text="Loading profile..." size="md" />
                </div>
              ) : selectedAttendee ? (
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {selectedAttendee.avatar_url ? (
                          <img 
                            src={selectedAttendee.avatar_url} 
                            alt={selectedAttendee.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">
                            {selectedAttendee.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {selectedAttendee.name} {selectedAttendee.surname || ""}
                        </h3>
                        {selectedAttendee.checked_in ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Checked in {selectedAttendee.checked_in_at && (
                              <>at {new Date(selectedAttendee.checked_in_at).toLocaleTimeString()}</>
                            )}
                          </span>
                        ) : (
                          <span className="text-sm text-yellow-400">Not checked in</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedAttendee(null)}
                      className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-6">
                    {selectedAttendee.email && (
                      <a 
                        href={`mailto:${selectedAttendee.email}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-white/60" />
                        <span className="text-white">{selectedAttendee.email}</span>
                      </a>
                    )}
                    {(selectedAttendee.phone || selectedAttendee.whatsapp) && (
                      <a 
                        href={`tel:${selectedAttendee.whatsapp || selectedAttendee.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Phone className="h-5 w-5 text-white/60" />
                        <span className="text-white">{selectedAttendee.whatsapp || selectedAttendee.phone}</span>
                      </a>
                    )}
                    {selectedAttendee.instagram_handle && (
                      <a 
                        href={`https://instagram.com/${selectedAttendee.instagram_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <Instagram className="h-5 w-5 text-white/60" />
                        <span className="text-white">@{selectedAttendee.instagram_handle}</span>
                      </a>
                    )}
                    {selectedAttendee.date_of_birth && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <Calendar className="h-5 w-5 text-white/60" />
                        <span className="text-white">
                          {new Date(selectedAttendee.date_of_birth).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Registration Info */}
                  {selectedAttendee.registered_at && (
                    <div className="mb-6 p-3 rounded-lg bg-white/5">
                      <p className="text-sm text-white/60 mb-1">Registered</p>
                      <p className="text-white">
                        {new Date(selectedAttendee.registered_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}

                  {/* Check In Button (if not checked in) */}
                  {!selectedAttendee.checked_in && selectedAttendee.registration_id && (
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        handleCheckIn(selectedAttendee.registration_id);
                        setSelectedAttendee(null);
                      }}
                    >
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Check In Now
                    </Button>
                  )}
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
