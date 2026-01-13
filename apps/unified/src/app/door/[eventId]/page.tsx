"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Input, Modal, Card, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, LoadingSpinner, InlineSpinner, VipStatus } from "@crowdstack/ui";
import {
  QrCode,
  Search,
  UserPlus,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  Users,
  Phone,
  Mail,
  Instagram,
  Calendar,
  Clock,
  User,
  X,
  ExternalLink,
  TrendingUp,
  UserCheck,
  Crown,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BeautifiedQRCode } from "@/components/BeautifiedQRCode";
import { AttendeeDetailModal } from "@/components/AttendeeDetailModal";
import { CheckInConfirmationModal } from "@/components/door/CheckInConfirmationModal";

interface VipStatus {
  isVip: boolean;
  isGlobalVip: boolean;
  isVenueVip: boolean;
  isOrganizerVip: boolean;
  isEventVip: boolean;
  vipReasons: string[];
}

interface FeedbackHistoryItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  submitted_at: string;
  event_name: string;
  event_date?: string | null;
}

interface CheckInResult {
  id: string;
  name: string;
  status: "success" | "error" | "duplicate" | "banned";
  message: string;
  timestamp: string;
  attendee_id?: string;
  registration_id?: string;
  vipStatus?: VipStatus;
  feedback_history?: FeedbackHistoryItem[];
  // Table party fields
  isTableParty?: boolean;
  tableName?: string;
  hostName?: string;
  isHost?: boolean;
  checkedInCount?: number;
}

interface EventInfo {
  id: string;
  name: string;
  slug: string;
  venue?: { id?: string; name: string };
  flier_url?: string;
  start_time?: string;
  end_time?: string | null;
}

interface SearchResult {
  registration_id: string;
  attendee_id: string;
  attendee_name: string;
  attendee_email: string | null;
  attendee_phone: string | null;
  checked_in: boolean;
  checked_in_at?: string | null;
  is_global_vip?: boolean;
  is_venue_vip?: boolean;
  is_organizer_vip?: boolean;
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
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [origin, setOrigin] = useState<string>(""); // Client-side origin to prevent hydration mismatch

  // Camera scanning state
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  
  // Processing state for check-ins
  const [processingCheckIn, setProcessingCheckIn] = useState(false);
  const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quick add modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: "", email: "", phone: "" });

  // VIP acknowledgement modal
  const [showVipAcknowledge, setShowVipAcknowledge] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  
  // QR code modal
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Attendee profile modal
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showAttendeeDetailModal, setShowAttendeeDetailModal] = useState(false);
  const [selectedAttendeeIdForModal, setSelectedAttendeeIdForModal] = useState<string | null>(null);
  const [doorRole, setDoorRole] = useState<"venue" | "organizer">("venue");
  
  // Check-in confirmation modal
  const [showCheckInConfirmation, setShowCheckInConfirmation] = useState(false);
  const [checkInPreviewData, setCheckInPreviewData] = useState<any>(null);
  const [loadingCheckInPreview, setLoadingCheckInPreview] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState<{ registrationId: string; qrToken?: string } | null>(null);
  const [confirmingCheckIn, setConfirmingCheckIn] = useState(false);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Set origin on client-side only to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadEventInfo = async () => {
    try {
      const response = await fetch(`/api/door/events/${eventId}`);
      const data = await response.json();
      
      if (response.status === 401) {
        setRequiresLogin(true);
        setError("Please sign in to access the door scanner");
        return;
      }
      
      if (response.status === 403) {
        setAccessDenied(true);
        setError(data.error || "You don't have access to this event's door scanner");
        return;
      }
      
      if (!response.ok) {
        setError(data.error || "Failed to load event");
        return;
      }
      
      // Determine role based on event (venue or organizer)
      if (data.event.venue_id) {
        setDoorRole("venue");
      } else if (data.event.organizer_id) {
        setDoorRole("organizer");
      }

      setEventInfo({
        id: data.event.id,
        name: data.event.name,
        slug: data.event.slug,
        venue: data.event.venue,
        flier_url: data.event.flier_url,
        start_time: data.event.start_time,
        end_time: data.event.end_time,
      });
    } catch (err) {
      console.error("Error loading event info:", err);
      setError("Failed to load event. Please try again.");
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

  // Fetch preview data for confirmation modal
  const fetchCheckInPreview = async (registrationId?: string, qrToken?: string) => {
    if (!registrationId && !qrToken) return;

    setLoadingCheckInPreview(true);
    try {
      const params = new URLSearchParams();
      if (registrationId) params.append("registration_id", registrationId);
      if (qrToken) params.append("qr_token", qrToken);

      const response = await fetch(`/api/events/${eventId}/checkin/preview?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setCheckInPreviewData(data);
        setPendingCheckIn({ registrationId: registrationId || "", qrToken });
        setShowCheckInConfirmation(true);
      } else {
        // If preview fails, show error
        const result: CheckInResult = {
          id: "",
          name: data.attendee?.full_name || "Unknown",
          status: "error",
          message: data.error || "Failed to load guest details",
          timestamp: new Date().toISOString(),
        };
        setLastCheckIn(result);
        setFlashColor("red");
        setTimeout(() => setFlashColor(null), 500);
      }
    } catch (err: any) {
      console.error("Preview error:", err);
      const result: CheckInResult = {
        id: "",
        name: "Unknown",
        status: "error",
        message: err.message || "Failed to load guest details",
        timestamp: new Date().toISOString(),
      };
      setLastCheckIn(result);
      setFlashColor("red");
      setTimeout(() => setFlashColor(null), 500);
    } finally {
      setLoadingCheckInPreview(false);
    }
  };

  // Actually perform the check-in after confirmation
  const confirmCheckIn = async () => {
    if (!pendingCheckIn) return;

    setConfirmingCheckIn(true);
    
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          registration_id: pendingCheckIn.registrationId, 
          qr_token: pendingCheckIn.qrToken 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const result: CheckInResult = {
          id: data.checkin?.id || data.guest_id || "",
          name: data.attendee_name || "Attendee",
          status: data.duplicate ? "duplicate" : "success",
          message: data.message || "Checked in successfully",
          timestamp: new Date().toISOString(),
          attendee_id: data.attendee_id,
          registration_id: data.registration_id,
          vipStatus: data.vip_status,
          feedback_history: data.feedback_history || [],
          // Table party fields
          isTableParty: data.is_table_party || false,
          tableName: data.table_name,
          hostName: data.host_name,
          isHost: data.is_host,
          checkedInCount: data.checked_in_count,
        };
        setLastCheckIn(result);

        // Close confirmation modal
        setShowCheckInConfirmation(false);
        setCheckInPreviewData(null);
        setPendingCheckIn(null);

        // If VIP, show VIP acknowledgement modal instead of auto-dismissing
        if (data.vip_status?.isVip) {
          setShowVipAcknowledge(true);
          setFlashColor("green");
          setTimeout(() => setFlashColor(null), 500);
        } else {
          setFlashColor(data.duplicate ? null : "green");
          if (!data.duplicate) {
            setTimeout(() => setFlashColor(null), 500);
          }
        }

        setRecentScans((prev) => [result, ...prev].slice(0, 10));
        loadStats();
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
        
        // Close modal on error
        setShowCheckInConfirmation(false);
        setCheckInPreviewData(null);
        setPendingCheckIn(null);
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
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
      
      // Close modal on error
      setShowCheckInConfirmation(false);
      setCheckInPreviewData(null);
      setPendingCheckIn(null);
    } finally {
      setConfirmingCheckIn(false);
    }
  };

  // Check-in functionality - now shows confirmation modal first
  const handleCheckIn = async (registrationId?: string, qrToken?: string) => {
    // Prevent duplicate scans within 3 seconds
    if (qrToken && lastScannedToken === qrToken) {
      console.log("Duplicate scan detected, ignoring");
      return;
    }

    // Prevent duplicate processing
    if (processingCheckIn || loadingCheckInPreview) {
      return;
    }

    if (qrToken) {
      setLastScannedToken(qrToken);
      // Clear the token after 3 seconds to allow re-scanning if needed
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      processingTimeoutRef.current = setTimeout(() => {
        setLastScannedToken(null);
      }, 3000);
    }

    setProcessingCheckIn(true);
    
    // Fetch preview and show confirmation modal
    await fetchCheckInPreview(registrationId, qrToken);
    
    setProcessingCheckIn(false);
  };

  // QR Scanner using html5-qrcode
  const startScanning = async () => {
    setCameraError(null);
    setScanning(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Prevent duplicate scans
          if (lastScannedToken === decodedText || processingCheckIn) {
            return;
          }

          scanner.pause(true);
          
          // Process check-in
          await handleCheckIn(undefined, decodedText);
          
          // Resume scanner after processing completes (with a small delay)
          setTimeout(() => {
            if (scannerRef.current && !processingCheckIn) {
              try {
                scanner.resume();
              } catch (e) {
                console.log("Could not resume scanner");
              }
            }
          }, 1000);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Camera error:", err);
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
      }
    } catch (err) {
      console.error("Error loading attendee profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Quick add functionality
  const handleQuickAdd = async () => {
    if (!quickAddForm.name.trim() || !quickAddForm.phone.trim()) {
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
      } else {
        alert(data.error || "Failed to add attendee");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add attendee");
    } finally {
      setQuickAddLoading(false);
    }
  };

  const getStatusBadge = (status: CheckInResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Success</Badge>;
      case "duplicate":
        return <Badge variant="warning" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Duplicate</Badge>;
      case "banned":
        return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Banned</Badge>;
      default:
        return <Badge variant="danger" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Error</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner text="Loading event..." size="lg" />
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="max-w-md w-full text-center">
          <User className="h-16 w-16 text-muted mx-auto mb-4" />
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-4">Sign In Required</h1>
          <p className="text-sm text-secondary mb-6">
            Please sign in to access the door scanner for this event.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push(`/login?redirect=/door/${eventId}`)}
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-accent-error mx-auto mb-4" />
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-4">Access Denied</h1>
          <p className="text-sm text-secondary mb-2">
            {error || "You don't have permission to access the door scanner for this event."}
          </p>
          <p className="text-xs text-muted mb-6">
            Only event organizers, venue admins, and assigned door staff can access this scanner.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => router.push("/door")}
            >
              Back to Events
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => router.push("/me")}
            >
              My Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !eventInfo) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="max-w-md w-full text-center">
          <AlertTriangle className="h-16 w-16 text-accent-warning mx-auto mb-4" />
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-4">Unable to Load Event</h1>
          <p className="text-sm text-secondary mb-6">{error}</p>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => router.push("/door")}
          >
            Back to Events
          </Button>
        </Card>
      </div>
    );
  }

  const isEventLive = eventInfo?.start_time && eventInfo?.end_time 
    ? new Date() >= new Date(eventInfo.start_time) && new Date() <= new Date(eventInfo.end_time)
    : eventInfo?.start_time 
    ? new Date() >= new Date(eventInfo.start_time)
    : false;

  return (
    <div className="space-y-4">
      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 pointer-events-none ${
              flashColor === "green" ? "bg-accent-success" : "bg-accent-error"
            }`}
          />
        )}
      </AnimatePresence>

      {/* Processing Overlay */}
      <AnimatePresence>
        {processingCheckIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-none"
          >
            <Card className="pointer-events-auto">
              <div className="flex flex-col items-center gap-4 p-6">
                <LoadingSpinner size="lg" />
                <p className="text-lg font-semibold text-primary">Processing check-in...</p>
                <p className="text-sm text-secondary">Please wait</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">{eventInfo?.name || "Door Scanner"}</h1>
          <p className="text-sm text-secondary">
            {eventInfo?.venue?.name && `${eventInfo.venue.name} • `}
            {isEventLive ? (
              <Badge variant="success" className="inline-flex items-center gap-1">
                <div className="h-1.5 w-1.5 bg-accent-success rounded-full animate-pulse" />
                Live Now
              </Badge>
            ) : (
              "Event Scanner"
            )}
          </p>
        </div>
        {eventInfo && (
          <Link href={`/e/${eventInfo.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Event
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-accent-success/30 bg-accent-success/5 !p-1.5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-0.5">Checked In</p>
          <p className="font-sans text-xl font-bold tracking-tight text-accent-success">{stats.checkedIn}</p>
          <p className="text-[10px] text-secondary mt-0.5 truncate">Current attendance</p>
        </Card>
        <Card className="!p-1.5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-0.5">Registered</p>
          <p className="font-sans text-xl font-bold tracking-tight text-primary">{stats.registered}</p>
          <p className="text-[10px] text-secondary mt-0.5 truncate">Total registrations</p>
        </Card>
        <Card className="border-accent-warning/30 bg-accent-warning/5 !p-1.5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-secondary mb-0.5">Remaining</p>
          <p className="font-sans text-xl font-bold tracking-tight text-accent-warning">{stats.remaining}</p>
          <p className="text-[10px] text-secondary mt-0.5 truncate">Available spots</p>
        </Card>
      </div>

      {/* Last Check-in Status */}
      <AnimatePresence>
        {lastCheckIn && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className={
              lastCheckIn.vipStatus?.isVip
                ? "border-amber-500/50 bg-amber-500/10 ring-2 ring-amber-500/30"
                : lastCheckIn.status === "success"
                ? "border-accent-success/30 bg-accent-success/5"
                : lastCheckIn.status === "duplicate"
                ? "border-accent-warning/30 bg-accent-warning/5"
                : "border-accent-error/30 bg-accent-error/5"
            }>
              {/* Table Party Banner */}
              {lastCheckIn.isTableParty && (
                <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-4 py-2 -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-bold text-lg">TABLE GUEST</span>
                  <span className="text-white/80">•</span>
                  <span className="font-medium">{lastCheckIn.tableName}</span>
                </div>
              )}
              {/* VIP Banner */}
              {lastCheckIn.vipStatus?.isVip && !lastCheckIn.isTableParty && (
                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-4 py-2 -mx-4 -mt-4 mb-4 rounded-t-lg flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5" />
                  <span className="font-bold text-lg">VIP GUEST</span>
                  <Crown className="h-5 w-5" />
                </div>
              )}
              <div className="flex items-center gap-3">
                {getStatusBadge(lastCheckIn.status)}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${lastCheckIn.vipStatus?.isVip ? 'text-xl text-amber-400' : lastCheckIn.isTableParty ? 'text-xl text-purple-300' : 'text-primary'}`}>
                    {lastCheckIn.name}
                    {lastCheckIn.isHost && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">Host</span>
                    )}
                  </p>
                  <p className="text-sm text-secondary">{lastCheckIn.message}</p>
                  {/* Table Party Info */}
                  {lastCheckIn.isTableParty && lastCheckIn.hostName && !lastCheckIn.isHost && (
                    <div className="mt-1 text-sm text-purple-300">
                      Hosted by {lastCheckIn.hostName}
                    </div>
                  )}
                  {/* VIP Reasons */}
                  {lastCheckIn.vipStatus?.isVip && lastCheckIn.vipStatus.vipReasons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {lastCheckIn.vipStatus.vipReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-amber-300">
                          <Star className="h-3 w-3 flex-shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!lastCheckIn.vipStatus?.isVip && !lastCheckIn.isTableParty && (
                  <button
                    onClick={() => setLastCheckIn(null)}
                    className="p-1 text-muted hover:text-primary rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Feedback History */}
              {lastCheckIn.feedback_history && lastCheckIn.feedback_history.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <p className="text-sm font-semibold text-primary">Venue Feedback History</p>
                    <Badge variant="default" className="text-[10px]">
                      {lastCheckIn.feedback_history.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lastCheckIn.feedback_history.map((feedback) => (
                      <div key={feedback.id} className="p-2 bg-raised rounded border border-border-subtle">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= feedback.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-400"
                                }`}
                              />
                            ))}
                            <Badge
                              variant={feedback.feedback_type === "positive" ? "success" : "warning"}
                              className="text-[9px] ml-1"
                            >
                              {feedback.feedback_type}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-secondary font-mono">
                            {feedback.event_date
                              ? new Date(feedback.event_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                        <p className="text-xs text-secondary font-medium mb-0.5">
                          {feedback.event_name}
                        </p>
                        {feedback.comment && (
                          <p className="text-xs text-secondary mt-1 line-clamp-2">
                            "{feedback.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* View Full Profile Button */}
              {lastCheckIn.attendee_id && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedAttendeeIdForModal(lastCheckIn.attendee_id!);
                      setShowAttendeeDetailModal(true);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    View Full Profile
                  </Button>
                </div>
              )}
              {/* VIP Acknowledgement Button */}
              {lastCheckIn.vipStatus?.isVip && showVipAcknowledge && (
                <div className="mt-4 pt-4 border-t border-amber-500/30">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full !bg-amber-500 hover:!bg-amber-600 !text-black font-bold"
                    onClick={() => {
                      setShowVipAcknowledge(false);
                      setLastCheckIn(null);
                    }}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Acknowledge VIP
                  </Button>
                  <p className="text-xs text-amber-300/70 text-center mt-2">
                    Tap to confirm you have acknowledged this VIP guest
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner Section */}
      <Card>
        <h2 className="section-header mb-3">QR Code Scanner</h2>
        
        {/* QR Reader container */}
        <div 
          id="qr-reader" 
          className="rounded-xl overflow-hidden bg-raised border border-border-subtle mb-4"
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
            className="w-full"
          >
            <Camera className="h-5 w-5 mr-2" />
            Start Camera Scan
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            onClick={stopScanning}
            className="w-full"
          >
            <CameraOff className="h-5 w-5 mr-2" />
            Stop Scanning
          </Button>
        )}

        {cameraError && (
          <Card className="mt-4 border-accent-error/30 bg-accent-error/5">
            <p className="text-sm text-accent-error">{cameraError}</p>
            <p className="text-xs text-muted mt-1">
              Make sure camera permissions are granted and you're using HTTPS.
            </p>
          </Card>
        )}
      </Card>

      {/* Search Section */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-header !mb-0 flex items-center">Search Attendees</h2>
          {!searchQuery.trim() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearch(true)}
              disabled={searching}
            >
              <Users className="h-4 w-4 mr-1" />
              View All
            </Button>
          )}
        </div>
        
        <div className="relative mb-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pr-10"
          />
          {searching && (
            <InlineSpinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Search Results Table */}
        {searchResults.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>VIP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result) => {
                  const isVip = result.is_global_vip || result.is_venue_vip || result.is_organizer_vip;
                  return (
                    <TableRow 
                      key={result.registration_id}
                      hover
                      className={`cursor-pointer ${isVip ? 'bg-amber-500/5 border-l-2 border-l-amber-400' : ''}`}
                      onClick={() => loadAttendeeProfile(result.attendee_id, result.registration_id)}
                    >
                      <TableCell className="font-medium">{result.attendee_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {result.attendee_email && (
                            <div className="text-sm text-secondary">{result.attendee_email}</div>
                          )}
                          {result.attendee_phone && (
                            <div className="text-sm text-secondary">{result.attendee_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VipStatus
                          isGlobalVip={result.is_global_vip}
                          isVenueVip={result.is_venue_vip}
                          isOrganizerVip={result.is_organizer_vip}
                          variant="badge"
                          size="xs"
                          showHighestOnly
                        />
                      </TableCell>
                      <TableCell>
                        {result.checked_in ? (
                          <Badge variant="success" className="flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" />
                            Checked In
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Checked In</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!result.checked_in ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e?.stopPropagation();
                                handleCheckIn(result.registration_id);
                              }}
                            >
                              Check In
                            </Button>
                          ) : (
                            <span className="text-sm text-muted">
                              {result.checked_in_at && new Date(result.checked_in_at).toLocaleTimeString()}
                            </span>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e?.stopPropagation();
                              setSelectedAttendeeIdForModal(result.attendee_id);
                              setShowAttendeeDetailModal(true);
                            }}
                          >
                            <User className="h-3 w-3 mr-1" />
                            Profile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setShowQuickAdd(true)}
          className="w-full"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Quick Add & Check In
        </Button>
        
        {eventInfo && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowQRCode(true)}
            className="w-full"
          >
            <QrCode className="h-5 w-5 mr-2" />
            Show Event QR Code
          </Button>
        )}
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <Card>
          <h2 className="section-header mb-3">Recent Check-ins ({recentScans.length})</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScans.map((scan, index) => (
                  <TableRow
                    key={`${scan.id}-${scan.timestamp}`}
                    hover={!!scan.attendee_id}
                    className={scan.attendee_id ? "cursor-pointer" : ""}
                    onClick={() => scan.attendee_id && loadAttendeeProfile(scan.attendee_id, scan.registration_id)}
                  >
                    <TableCell className="font-medium">{scan.name}</TableCell>
                    <TableCell>{getStatusBadge(scan.status)}</TableCell>
                    <TableCell className="text-sm text-secondary">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* QR Code Modal */}
      {eventInfo && (
        <Modal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          title="Event Registration QR Code"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Scan this QR code to register for the event. Registrations will be attributed to the venue.
            </p>
            
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg">
              <BeautifiedQRCode
                url={(() => {
                  const baseUrl = origin 
                    ? `${origin}/e/${eventInfo.slug}/register`
                    : `/e/${eventInfo.slug}/register`;
                  if (eventInfo.venue?.id) {
                    return `${baseUrl}?ref=venue_${eventInfo.venue.id}`;
                  }
                  return baseUrl;
                })()}
                size={256}
                logoSize={50}
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-primary">Event Registration Link</p>
              <p className="text-xs text-secondary break-all">
                {origin 
                  ? `${origin}/e/${eventInfo.slug}/register`
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
        <div className="space-y-3">
          <p className="text-sm text-secondary">
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
      <Modal
        isOpen={!!selectedAttendee || loadingProfile}
        onClose={() => !loadingProfile && setSelectedAttendee(null)}
        title={selectedAttendee ? `${selectedAttendee.name}${selectedAttendee.surname ? ` ${selectedAttendee.surname}` : ""}` : "Loading Profile"}
        size="lg"
      >
        {loadingProfile ? (
          <div className="p-8 flex items-center justify-center">
            <LoadingSpinner text="Loading profile..." />
          </div>
        ) : selectedAttendee ? (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center overflow-hidden">
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
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary">
                  {selectedAttendee.name} {selectedAttendee.surname || ""}
                </h3>
                {selectedAttendee.checked_in ? (
                  <Badge variant="success" className="mt-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Checked in {selectedAttendee.checked_in_at && (
                      <>at {new Date(selectedAttendee.checked_in_at).toLocaleTimeString()}</>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="warning" className="mt-1">Not checked in</Badge>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              {selectedAttendee.email && (
                <a 
                  href={`mailto:${selectedAttendee.email}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle hover:bg-active transition-colors"
                >
                  <Mail className="h-4 w-4 text-muted" />
                  <span className="text-primary">{selectedAttendee.email}</span>
                </a>
              )}
              {(selectedAttendee.phone || selectedAttendee.whatsapp) && (
                <a 
                  href={`tel:${selectedAttendee.whatsapp || selectedAttendee.phone}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle hover:bg-active transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted" />
                  <span className="text-primary">{selectedAttendee.whatsapp || selectedAttendee.phone}</span>
                </a>
              )}
              {selectedAttendee.instagram_handle && (
                <a 
                  href={`https://instagram.com/${selectedAttendee.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle hover:bg-active transition-colors"
                >
                  <Instagram className="h-4 w-4 text-muted" />
                  <span className="text-primary">@{selectedAttendee.instagram_handle}</span>
                </a>
              )}
              {selectedAttendee.date_of_birth && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-subtle">
                  <Calendar className="h-4 w-4 text-muted" />
                  <span className="text-primary">
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
              <Card padding="compact">
                <p className="text-sm text-secondary mb-1">Registered</p>
                <p className="text-primary">
                  {new Date(selectedAttendee.registered_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </Card>
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
      </Modal>

      {/* Attendee Detail Modal */}
      {selectedAttendeeIdForModal && (
        <AttendeeDetailModal
          isOpen={showAttendeeDetailModal}
          onClose={() => {
            setShowAttendeeDetailModal(false);
            setSelectedAttendeeIdForModal(null);
          }}
          attendeeId={selectedAttendeeIdForModal}
          role={doorRole}
        />
      )}

      {/* Check-in Confirmation Modal */}
      <CheckInConfirmationModal
        isOpen={showCheckInConfirmation}
        onClose={() => {
          setShowCheckInConfirmation(false);
          setCheckInPreviewData(null);
          setPendingCheckIn(null);
        }}
        onConfirm={confirmCheckIn}
        data={checkInPreviewData}
        loading={loadingCheckInPreview}
        confirming={confirmingCheckIn}
      />
    </div>
  );
}
