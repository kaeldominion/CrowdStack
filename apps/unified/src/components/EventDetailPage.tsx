"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  ConfirmModal,
  Textarea,
  Select,
  InlineSpinner,
  LoadingSpinner,
} from "@crowdstack/ui";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  BarChart3,
  Building2,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  History,
  UserPlus,
  Image as ImageIcon,
  Video,
  ExternalLink,
  Edit,
  QrCode,
  Radio,
  Share2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Globe,
  EyeOff,
  Trash2,
  Star,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { DoorStaffModal } from "@/components/DoorStaffModal";
import { PromoterManagementModal } from "@/components/PromoterManagementModal";
import { PhotoUploader } from "@/components/PhotoUploader";
import { EventImageUpload } from "@/components/EventImageUpload";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export type EventDetailRole = "organizer" | "venue" | "promoter" | "admin";

interface EventDetailConfig {
  role: EventDetailRole;
  eventApiEndpoint: string;
  statsApiEndpoint?: string;
  attendeesApiEndpoint?: string;
  approveApiEndpoint?: string;
  backUrl: string;
  liveUrl: string;
  canEdit?: boolean;
  canManagePromoters?: boolean;
  canManageDoorStaff?: boolean;
  canViewAttendees?: boolean;
  canViewPromoters?: boolean;
  canViewPhotos?: boolean;
  canViewSettings?: boolean;
  canViewStats?: boolean;
  canApprove?: boolean;
  canPublish?: boolean;
  showVenueApproval?: boolean;
  showEditHistory?: boolean;
}

interface EventData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  flier_url: string | null;
  flier_video_url: string | null;
  timezone: string | null;
  mobile_style: "flip" | "scroll" | null;
  promoter_access_type?: string;
  organizer_id: string;
  venue_id: string | null;
  venue_approval_status?: string | null;
  venue_approval_at?: string | null;
  venue_rejection_reason?: string | null;
  created_at: string;
  organizer?: { id: string; name: string; email: string | null };
  venue?: { id: string; name: string; address: string | null; city: string | null };
  event_promoters?: Array<{
    id: string;
    promoter: { id: string; name: string; email: string | null } | null;
    commission_type: string;
    commission_config: any;
  }>;
}

interface Stats {
  total_registrations?: number;
  total_check_ins?: number;
  capacity?: number | null;
  capacity_remaining?: number | null;
  capacity_percentage?: number | null;
  recent_registrations_24h?: number;
  promoter_breakdown?: Array<{
    promoter_id: string;
    promoter_name: string;
    registrations: number;
    check_ins: number;
  }>;
  chart_data?: Array<{
    date: string;
    registrations: number;
    checkins: number;
  }>;
  // Promoter-specific stats
  referrals?: number;
  checkins?: number;
  conversionRate?: number;
}

type ReferralSource = "direct" | "venue" | "organizer" | "promoter" | "user_referral";

interface Attendee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  checked_in: boolean;
  check_in_time: string | null;
  referral_source: ReferralSource;
  promoter_id: string | null;
  promoter_name: string | null;
  referred_by_user_id: string | null;
  referred_by_user_name: string | null;
}

interface PromoterOption {
  id: string;
  name: string;
}

interface AttendeeStats {
  total: number;
  checked_in: number;
  not_checked_in: number;
  by_source: {
    direct: number;
    promoter: number;
    user_referral: number;
  };
}

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  display_order: number;
  url: string;
  thumbnail_url: string;
  created_at: string;
}

interface Album {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  cover_photo_id: string | null;
  published_at: string | null;
}

interface InviteQRCode {
  id: string;
  invite_code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

interface EditRecord {
  id: string;
  edited_by: string;
  editor_email: string;
  editor_role: string;
  changes: Record<string, { old: any; new: any }>;
  reason: string | null;
  created_at: string;
}

interface EventDetailPageProps {
  eventId: string;
  config: EventDetailConfig;
}

export function EventDetailPage({ eventId, config }: EventDetailPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [promoterOptions, setPromoterOptions] = useState<PromoterOption[]>([]);
  const [attendeeStats, setAttendeeStats] = useState<AttendeeStats | null>(null);
  const [isPromoterView, setIsPromoterView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "checked_in" | "not_checked_in">("all");
  const [sourceFilter, setSourceFilter] = useState<ReferralSource | "all">("all");
  const [promoterFilter, setPromoterFilter] = useState<string>("all");
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDoorStaffModal, setShowDoorStaffModal] = useState(false);
  const [showPromoterModal, setShowPromoterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHistory, setEditHistory] = useState<EditRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadSuccess, setVideoUploadSuccess] = useState(false);
  const [showRemoveVideoModal, setShowRemoveVideoModal] = useState(false);
  const [removingVideo, setRemovingVideo] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteQRCode[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [publishingPhotos, setPublishingPhotos] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    description: "",
    start_time: "",
    end_time: "",
    capacity: "",
    status: "",
    organizer_id: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    mobile_style: "flip" as "flip" | "scroll",
    reason: "",
  });

  useEffect(() => {
    loadEventData();
    if (config.statsApiEndpoint) {
      loadStats();
    }
    if (config.canViewAttendees && config.attendeesApiEndpoint) {
      loadAttendees();
    }
    if (config.showEditHistory) {
      loadEditHistory();
    }
    if (config.canViewPhotos) {
      loadPhotos();
    }
    if (config.role === "organizer") {
      loadInviteCodes();
    }
    if (config.role === "admin") {
      loadOrganizers();
    }
    
    // Refresh stats every 30 seconds if viewing stats
    if (config.canViewStats && config.statsApiEndpoint) {
      const statsInterval = setInterval(loadStats, 30000);
      return () => clearInterval(statsInterval);
    }
  }, [eventId, config]);

  const loadEventData = async (resetForm = true) => {
    try {
      const response = await fetch(config.eventApiEndpoint);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
        // Only reset the form if requested (don't reset during image uploads while modal is open)
        if (config.canEdit && resetForm) {
          setEditForm({
            name: data.event.name || "",
            slug: data.event.slug || "",
            description: data.event.description || "",
            start_time: data.event.start_time?.slice(0, 16) || "",
            end_time: data.event.end_time?.slice(0, 16) || "",
            capacity: data.event.capacity?.toString() || "",
            status: data.event.status || "",
            organizer_id: data.event.organizer_id || "",
            timezone: data.event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
            mobile_style: data.event.mobile_style || "flip",
            reason: "",
          });
        }
      } else if (response.status === 403 || response.status === 404) {
        router.push(config.backUrl);
      }
    } catch (error) {
      console.error("Failed to load event:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!config.statsApiEndpoint) return;
    try {
      const response = await fetch(config.statsApiEndpoint);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadAttendees = async () => {
    // Use the general attendees API for all roles - it handles permissions internally
    const endpoint = `/api/events/${eventId}/attendees`;
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAttendees(data.attendees || []);
        setPromoterOptions(data.promoters || []);
        setAttendeeStats(data.stats || null);
        setIsPromoterView(data.userContext?.isPromoter || false);
      }
    } catch (error) {
      console.error("Failed to load attendees:", error);
    }
  };

  const loadEditHistory = async () => {
    try {
      const endpoint = config.role === "venue" 
        ? `/api/venue/events/${eventId}/edit`
        : `/api/events/${eventId}/edit-history`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setEditHistory(data.edits || data.history || []);
      }
    } catch (error) {
      console.error("Failed to load edit history:", error);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    await loadEditHistory();
  };

  const handleSaveEdit = async () => {
    if (!event) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      
      // Debug logging for date comparison
      console.log("[EventEdit] Comparing dates:", {
        editForm_start: editForm.start_time,
        event_start_raw: event.start_time,
        event_start_sliced: event.start_time?.slice(0, 16),
        are_different: editForm.start_time !== event.start_time?.slice(0, 16),
      });
      
      if (editForm.name !== event.name) updates.name = editForm.name;
      if (editForm.slug !== event.slug) updates.slug = editForm.slug;
      if (editForm.description !== (event.description || "")) updates.description = editForm.description || null;
      if (editForm.start_time !== event.start_time?.slice(0, 16)) {
        updates.start_time = new Date(editForm.start_time).toISOString();
      }
      if (editForm.end_time !== (event.end_time?.slice(0, 16) || "")) {
        updates.end_time = editForm.end_time ? new Date(editForm.end_time).toISOString() : null;
      }
      
      console.log("[EventEdit] Updates to save:", updates);
      if (editForm.capacity !== (event.capacity?.toString() || "")) updates.capacity = editForm.capacity ? parseInt(editForm.capacity) : null;
      if (editForm.status !== event.status) updates.status = editForm.status;
      if (editForm.organizer_id !== event.organizer_id) updates.organizer_id = editForm.organizer_id;
      if (editForm.timezone !== (event.timezone || "")) updates.timezone = editForm.timezone || "America/New_York";
      if (editForm.mobile_style !== (event.mobile_style || "flip")) updates.mobile_style = editForm.mobile_style;

      if (Object.keys(updates).length === 0) {
        // No form changes - just close the modal (video/image uploads save separately)
        setShowEditModal(false);
        return;
      }

      const endpoint = config.role === "venue"
        ? `/api/venue/events/${eventId}/edit`
        : config.role === "admin"
        ? config.eventApiEndpoint
        : `/api/events/${eventId}`;

      console.log("[EventEdit] Sending to endpoint:", endpoint);
      console.log("[EventEdit] Request body:", JSON.stringify(updates));
      
      const response = await fetch(endpoint, {
        method: config.role === "venue" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          config.role === "venue" 
            ? { updates, reason: editForm.reason || undefined }
            : updates
        ),
      });

      console.log("[EventEdit] Response status:", response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("[EventEdit] Error response:", error);
        throw new Error(error.error || "Failed to save changes");
      }

      const responseData = await response.json();
      console.log("[EventEdit] Success response:", responseData);
      console.log("[EventEdit] Saved start_time:", responseData.event?.start_time);

      await loadEventData();
      setShowEditModal(false);
      setEditForm((prev) => ({ ...prev, reason: "" }));
    } catch (error: any) {
      alert(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async () => {
    if (!event || !config.approveApiEndpoint) return;

    setApproving(true);
    try {
      const response = await fetch(config.approveApiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: approvalAction,
          rejection_reason: approvalAction === "reject" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process approval");
      }

      await loadEventData();
      setShowApprovalModal(false);
      setRejectionReason("");
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setApproving(false);
    }
  };

  const openApprovalModal = (action: "approve" | "reject") => {
    setApprovalAction(action);
    setRejectionReason("");
    setShowApprovalModal(true);
  };

  const handlePublishToggle = async () => {
    if (!event) return;

    setPublishing(true);
    try {
      const newStatus = event.status === "published" ? "draft" : "published";
      const response = await fetch(config.eventApiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event status");
      }

      await loadEventData();
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setPublishing(false);
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/photos`);
      if (response.ok) {
        const data = await response.json();
        setAlbum(data.album);
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error("Failed to load photos:", error);
    }
  };

  const loadInviteCodes = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/invites`);
      if (response.ok) {
        const data = await response.json();
        setInviteCodes(data.invite_qr_codes || []);
      }
    } catch (error) {
      console.error("Failed to load invite codes:", error);
    }
  };

  const loadOrganizers = async () => {
    try {
      const response = await fetch("/api/admin/organizers");
      if (response.ok) {
        const data = await response.json();
        setOrganizers(data.organizers || []);
      }
    } catch (error) {
      console.error("Failed to load organizers:", error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      setDeletingPhoto(photoId);
      const response = await fetch(`/api/events/${eventId}/photos/${photoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (album?.cover_photo_id === photoId) {
          setAlbum((prev) => (prev ? { ...prev, cover_photo_id: null } : null));
        }
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleSetCoverPhoto = async (photoId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/photos/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (response.ok) {
        setAlbum((prev) =>
          prev ? { ...prev, cover_photo_id: photoId } : null
        );
      }
    } catch (error) {
      console.error("Error setting cover photo:", error);
      alert("Failed to set cover photo");
    }
  };

  const handlePublishPhotos = async () => {
    if (!album) return;
    if (!confirm("Publish this photo album? Attendees will be notified.")) {
      return;
    }

    setPublishingPhotos(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/publish`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        await loadPhotos();
        alert(`Photos published! ${data.emails_sent || 0} attendees notified.`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish photos");
      }
    } catch (error) {
      console.error("Error publishing photos:", error);
      alert("Failed to publish photos");
    } finally {
      setPublishingPhotos(false);
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/i/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteId(inviteCode);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  // Mask email and phone for privacy
  const maskEmail = (email: string | null): string => {
    if (!email) return "-";
    if (config.role === "admin") return email; // Admin sees full email
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const maskedLocal = local.length > 2 
      ? `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}`
      : "**";
    return `${maskedLocal}@${domain}`;
  };

  const maskPhone = (phone: string | null): string => {
    if (!phone) return "-";
    if (config.role === "admin") return phone; // Admin sees full phone
    if (phone.length <= 4) return "**" + phone.slice(-2);
    return "**" + phone.slice(-4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatApprovalDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string | null | undefined) => {
    if (!status) return null;
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <ShieldX className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "not_required":
        return <Badge variant="secondary">No Approval Needed</Badge>;
      default:
        return null;
    }
  };

  // Filter attendees by search, status, source, and promoter
  const filteredAttendees = attendees.filter((attendee) => {
    // Status filter
    if (statusFilter === "checked_in" && !attendee.checked_in) return false;
    if (statusFilter === "not_checked_in" && attendee.checked_in) return false;
    
    // Source filter
    if (sourceFilter !== "all" && attendee.referral_source !== sourceFilter) return false;
    
    // Promoter filter
    if (promoterFilter !== "all" && attendee.promoter_id !== promoterFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      attendee.name.toLowerCase().includes(query) ||
      attendee.email?.toLowerCase().includes(query) ||
      attendee.promoter_name?.toLowerCase().includes(query) ||
      attendee.phone?.includes(query)
    );
  });

  // Use chart data from API, or generate empty array if not available
  const chartData = stats?.chart_data || [];

  const eventUrl = event?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/e/${event.slug}`
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading event..." size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Event Not Found</h2>
        <p className="text-foreground-muted mb-4">This event doesn't exist or you don't have access.</p>
        <Link href={config.backUrl}>
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </div>
    );
  }

  // Determine which tabs to show
  const tabs = [];
  if (config.canViewStats || config.role === "promoter") {
    tabs.push({ value: "overview", label: "Overview" });
  }
  if (config.canViewAttendees) {
    tabs.push({ value: "attendees", label: `Attendees (${attendees.length})` });
  }
  if (config.canViewPromoters) {
    tabs.push({ value: "promoters", label: "Promoters" });
  }
  if (config.canViewPhotos) {
    tabs.push({ value: "photos", label: "Photos" });
  }
  if (config.canViewSettings) {
    tabs.push({ value: "settings", label: "Settings" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={config.backUrl}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            {event.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(event.status)}
            {config.showVenueApproval && getApprovalBadge(event.venue_approval_status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={config.liveUrl}>
            <Button variant="primary">
              <Radio className="h-4 w-4 mr-2" />
              {config.role === "promoter" ? "Live View" : "Live Control"}
            </Button>
          </Link>
          {config.role !== "promoter" && (
            <Link href={`/door/${eventId}`} target="_blank">
              <Button variant="secondary">
                <QrCode className="h-4 w-4 mr-2" />
                Door Scanner
              </Button>
            </Link>
          )}
          {config.canManagePromoters && (
            <Button variant="secondary" onClick={() => setShowPromoterModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Manage Promoters
            </Button>
          )}
          {config.canManageDoorStaff && (
            <Button variant="secondary" onClick={() => setShowDoorStaffModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Door Staff
            </Button>
          )}
          {config.showEditHistory && (
            <Button variant="secondary" onClick={handleOpenHistory}>
              <History className="h-4 w-4 mr-2" />
              Edit History
            </Button>
          )}
          {config.canEdit && (
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Event
            </Button>
          )}
          {config.canApprove && event.venue_id && (
            <>
              {event.venue_approval_status !== "approved" && (
                <Button
                  variant="primary"
                  onClick={() => openApprovalModal("approve")}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Approve Event
                </Button>
              )}
              {event.venue_approval_status !== "rejected" && (
                <Button
                  variant="secondary"
                  onClick={() => openApprovalModal("reject")}
                >
                  <ShieldX className="h-4 w-4 mr-2" />
                  Reject Event
                </Button>
              )}
            </>
          )}
          {config.canPublish && event && (
            (event.status || "draft") === "published" ? (
              <Button
                variant="secondary"
                onClick={handlePublishToggle}
                disabled={publishing}
                loading={publishing}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish Event
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handlePublishToggle}
                disabled={publishing}
                loading={publishing}
              >
                <Globe className="h-4 w-4 mr-2" />
                Publish Event
              </Button>
            )
          )}
          {config.role === "promoter" && (
            <>
              <Link href={`/events/${event.id}/share`} target="_blank">
                <Button variant="secondary">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </Button>
              </Link>
              <Link href={`/promoter/qr/${eventId}`} target="_blank">
                <Button variant="secondary">
                  <QrCode className="h-4 w-4 mr-2" />
                  My QR Code
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Venue Approval Status (for organizers) */}
      {config.role === "organizer" && config.showVenueApproval && event.venue_approval_status && (
        <Card className="p-6 border-l-4 border-l-warning">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${
              event.venue_approval_status === "approved"
                ? "bg-success/20"
                : event.venue_approval_status === "rejected"
                ? "bg-error/20"
                : "bg-warning/20"
            }`}>
              {event.venue_approval_status === "approved" ? (
                <ShieldCheck className="h-8 w-8 text-success" />
              ) : event.venue_approval_status === "rejected" ? (
                <ShieldX className="h-8 w-8 text-error" />
              ) : (
                <ShieldAlert className="h-8 w-8 text-warning" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`text-lg font-bold ${
                  event.venue_approval_status === "approved"
                    ? "text-success"
                    : event.venue_approval_status === "rejected"
                    ? "text-error"
                    : "text-warning"
                }`}>
                  {event.venue_approval_status === "approved"
                    ? "✓ Approved by Venue"
                    : event.venue_approval_status === "rejected"
                    ? "✗ Rejected by Venue"
                    : "⏳ Awaiting Venue Approval"}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-foreground-muted mb-2">
                <Building2 className="h-4 w-4" />
                <span>{event.venue?.name || "Venue"}</span>
              </div>
              {event.venue_approval_status === "approved" && event.venue_approval_at && (
                <p className="text-sm text-foreground-muted">
                  Approved on {formatApprovalDate(event.venue_approval_at)}
                </p>
              )}
              {event.venue_approval_status === "rejected" && (
                <div className="mt-2 p-3 bg-error/10 rounded-lg border border-error/20">
                  <p className="text-sm text-error font-medium">
                    {event.venue_rejection_reason || "No reason provided"}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    You can edit the event and try a different venue.
                  </p>
                </div>
              )}
              {event.venue_approval_status === "pending" && (
                <p className="text-sm text-foreground-muted">
                  The venue has been notified and will review your event soon. 
                  You'll receive a notification when they respond.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      {config.canViewStats && stats && (
        <div className={`grid gap-4 ${
          config.role === "promoter" 
            ? "md:grid-cols-3" 
            : "md:grid-cols-2 lg:grid-cols-4"
        }`}>
          {config.role === "promoter" ? (
            <>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-muted">My Referrals</p>
                    <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                      {stats.referrals || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-muted">Check-ins</p>
                    <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                      {stats.checkins || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-success/10">
                    <UserCheck className="h-6 w-6 text-success" />
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground-muted">Conversion Rate</p>
                    <p className="text-3xl font-bold tracking-tighter text-foreground mt-1">
                      {stats.conversionRate?.toFixed(0) || 0}%
                    </p>
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-warning/10">
                    <TrendingUp className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <div className="space-y-2">
                  <div className="text-sm text-foreground-muted">Registrations</div>
                  <div className="text-3xl font-bold text-foreground">
                    {stats.total_registrations || 0}
                  </div>
                  {stats.recent_registrations_24h !== undefined && (
                    <div className="text-xs text-foreground-muted flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{stats.recent_registrations_24h} in last 24h
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <div className="space-y-2">
                  <div className="text-sm text-foreground-muted">Check-ins</div>
                  <div className="text-3xl font-bold text-foreground">
                    {stats.total_check_ins || 0}
                  </div>
                  {stats.total_registrations && stats.total_registrations > 0 && (
                    <div className="text-xs text-foreground-muted flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {Math.round(((stats.total_check_ins || 0) / stats.total_registrations) * 100)}% conversion
                    </div>
                  )}
                </div>
              </Card>
              {stats.capacity !== undefined && (
                <Card>
                  <div className="space-y-2">
                    <div className="text-sm text-foreground-muted">Capacity</div>
                    <div className="text-3xl font-bold text-foreground">
                      {stats.capacity ? `${stats.capacity_remaining}/${stats.capacity}` : "Unlimited"}
                    </div>
                    {stats.capacity && (
                      <div className="text-xs text-foreground-muted">
                        {stats.capacity_percentage}% full
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {event.event_promoters && (
                <Card>
                  <div className="space-y-2">
                    <div className="text-sm text-foreground-muted">Promoters</div>
                    <div className="text-3xl font-bold text-foreground">
                      {event.event_promoters.length}
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Active promotions
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={tabs[0]?.value}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.value === "photos" && <ImageIcon className="h-4 w-4 mr-1" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Event Info */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Event Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-foreground-muted">Start Time</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-foreground-muted" />
                      <span className="text-foreground">
                        {new Date(event.start_time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {event.end_time && (
                    <div>
                      <div className="text-sm text-foreground-muted">End Time</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-4 w-4 text-foreground-muted" />
                        <span className="text-foreground">
                          {new Date(event.end_time).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {event.venue && (
                  <div>
                    <div className="text-sm text-foreground-muted">Venue</div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-foreground-muted" />
                      <span className="text-foreground">{event.venue.name}</span>
                      {event.venue.address && (
                        <span className="text-foreground-muted text-sm">- {event.venue.address}</span>
                      )}
                    </div>
                  </div>
                )}
                {event.organizer && (
                  <div>
                    <div className="text-sm text-foreground-muted">Organizer</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-foreground-muted" />
                      <span className="text-foreground">{event.organizer.name}</span>
                    </div>
                  </div>
                )}
                {event.description && (
                  <div>
                    <div className="text-sm text-foreground-muted mb-2">Description</div>
                    <p className="text-foreground">{event.description}</p>
                  </div>
                )}
                {eventUrl && (
                  <div>
                    <div className="text-sm text-foreground-muted mb-2">Public URL</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-background-secondary px-2 py-1 rounded">
                        {eventUrl}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(eventUrl);
                          window.open(eventUrl, "_blank");
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Charts (for organizer/venue) */}
            {config.role !== "promoter" && config.canViewStats && stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {chartData.length > 0 ? (
                  <Card>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Registrations Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="registrations" stroke="#8884d8" name="Registrations" />
                        <Line type="monotone" dataKey="checkins" stroke="#10b981" name="Check-ins" />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                ) : (
                  <Card>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Registrations Over Time
                    </h3>
                    <div className="flex items-center justify-center h-[200px] text-foreground-muted">
                      No registration data yet
                    </div>
                  </Card>
                )}
                {stats.promoter_breakdown && stats.promoter_breakdown.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Promoter Performance
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.promoter_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="promoter_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="check_ins" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {config.canViewAttendees && (
            <TabsContent value="attendees" className="space-y-4">
              {/* Invite Codes Section (for organizers) */}
              {config.role === "organizer" && inviteCodes.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">Invite QR Codes</h2>
                    <Link href={`/app/organizer/events/${eventId}/invites`}>
                      <Button variant="secondary" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        Manage Invites
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inviteCodes.slice(0, 3).map((invite) => (
                      <div key={invite.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <code className="text-sm font-mono font-semibold">{invite.invite_code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invite.invite_code)}
                          >
                            {copiedInviteId === invite.invite_code ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-xs text-foreground-muted space-y-1">
                          {invite.max_uses ? (
                            <p>Uses: {invite.used_count} / {invite.max_uses}</p>
                          ) : (
                            <p>Uses: {invite.used_count} (unlimited)</p>
                          )}
                          {invite.expires_at && (
                            <p>Expires: {new Date(invite.expires_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {inviteCodes.length > 3 && (
                    <div className="mt-4 text-center">
                      <Link href={`/app/organizer/events/${eventId}/invites`}>
                        <Button variant="ghost" size="sm">
                          View all {inviteCodes.length} invite codes
                        </Button>
                      </Link>
                    </div>
                  )}
                </Card>
              )}

              {/* Attendee Stats Summary */}
              {attendeeStats && !isPromoterView && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-foreground">{attendeeStats.total}</div>
                    <div className="text-sm text-foreground-muted">Total Registered</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-success">{attendeeStats.checked_in}</div>
                    <div className="text-sm text-foreground-muted">Checked In</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-warning">{attendeeStats.not_checked_in}</div>
                    <div className="text-sm text-foreground-muted">Not Checked In</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-info">{attendeeStats.by_source.direct}</div>
                    <div className="text-sm text-foreground-muted">Direct</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{attendeeStats.by_source.promoter}</div>
                    <div className="text-sm text-foreground-muted">Via Promoters</div>
                  </Card>
                </div>
              )}

              {/* Promoter View Header */}
              {isPromoterView && (
                <Card className="mb-4 p-4 bg-primary/10 border-primary/20">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">Your Referrals</h3>
                      <p className="text-sm text-foreground-muted">
                        Showing only guests you brought to this event
                      </p>
                    </div>
                  </div>
                  {attendeeStats && (
                    <div className="flex gap-6 mt-4">
                      <div>
                        <span className="text-2xl font-bold text-foreground">{attendeeStats.total}</span>
                        <span className="text-sm text-foreground-muted ml-2">registered</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-success">{attendeeStats.checked_in}</span>
                        <span className="text-sm text-foreground-muted ml-2">checked in</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          {attendeeStats.total > 0 ? Math.round((attendeeStats.checked_in / attendeeStats.total) * 100) : 0}%
                        </span>
                        <span className="text-sm text-foreground-muted ml-2">conversion</span>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Card>
                {/* Header with title and search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {isPromoterView ? "Your Guests" : "Attendees"} ({filteredAttendees.length})
                  </h2>
                  <Input
                    placeholder="Search by name, email, or promoter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-xs"
                  />
                </div>

                {/* Filters Row */}
                {!isPromoterView && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {/* Status Filter */}
                    <div className="flex gap-1">
                      <Button
                        variant={statusFilter === "all" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setStatusFilter("all")}
                      >
                        All
                      </Button>
                      <Button
                        variant={statusFilter === "checked_in" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setStatusFilter("checked_in")}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Checked In
                      </Button>
                      <Button
                        variant={statusFilter === "not_checked_in" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setStatusFilter("not_checked_in")}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Not Checked In
                      </Button>
                    </div>

                    {/* Source Filter */}
                    <Select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value as ReferralSource | "all")}
                      options={[
                        { value: "all", label: "All Sources" },
                        { value: "direct", label: "Direct Registration" },
                        { value: "promoter", label: "Via Promoter" },
                        { value: "user_referral", label: "User Referral" },
                      ]}
                    />

                    {/* Promoter Filter (only if promoters exist) */}
                    {promoterOptions.length > 0 && (
                      <Select
                        value={promoterFilter}
                        onChange={(e) => setPromoterFilter(e.target.value)}
                        options={[
                          { value: "all", label: "All Promoters" },
                          ...promoterOptions.map((p) => ({ value: p.id, label: p.name })),
                        ]}
                      />
                    )}
                  </div>
                )}

                {/* Privacy Notice */}
                {config.role !== "admin" && (
                  <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded-lg">
                    <p className="text-sm text-foreground-muted">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Contact details are masked for privacy. Only admins can see full information.
                    </p>
                  </div>
                )}

                {/* Attendees Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      {!isPromoterView && <TableHead>Source</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isPromoterView ? 5 : 6} className="text-center text-foreground-muted py-8">
                          {isPromoterView ? "You haven't referred any guests to this event yet" : "No attendees found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendees.map((attendee) => (
                        <TableRow key={attendee.id}>
                          <TableCell className="font-medium">{attendee.name}</TableCell>
                          <TableCell>{maskEmail(attendee.email)}</TableCell>
                          <TableCell>{maskPhone(attendee.phone)}</TableCell>
                          <TableCell>
                            {new Date(attendee.registration_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {attendee.checked_in ? (
                              <Badge variant="success" className="flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Checked In
                              </Badge>
                            ) : (
                              <Badge variant="default" className="flex items-center gap-1 w-fit">
                                <Clock className="h-3 w-3" />
                                Registered
                              </Badge>
                            )}
                          </TableCell>
                          {!isPromoterView && (
                            <TableCell>
                              {attendee.referral_source === "promoter" && attendee.promoter_name ? (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                  <Users className="h-3 w-3" />
                                  {attendee.promoter_name}
                                </Badge>
                              ) : attendee.referral_source === "user_referral" && attendee.referred_by_user_name ? (
                                <Badge variant="primary" className="flex items-center gap-1 w-fit">
                                  <Share2 className="h-3 w-3" />
                                  {attendee.referred_by_user_name}
                                </Badge>
                              ) : (
                                <span className="text-foreground-muted text-sm">Direct</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          )}

          {config.canViewPromoters && (
            <TabsContent value="promoters" className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Promoters</h2>
                  <div className="flex gap-2">
                    {config.canManagePromoters && (
                      <Button variant="primary" onClick={() => setShowPromoterModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Manage Promoters
                      </Button>
                    )}
                    {config.role === "organizer" && (
                      <Link href={`/app/organizer/events/${eventId}/invites`}>
                        <Button variant="secondary">
                          <QrCode className="h-4 w-4 mr-2" />
                          Invite Codes
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                {event.event_promoters && event.event_promoters.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Promoter</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Commission Type</TableHead>
                        {config.canViewStats && (
                          <>
                            <TableHead>Registrations</TableHead>
                            <TableHead>Check-ins</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {event.event_promoters.map((ep) => {
                        const promoterStats = stats?.promoter_breakdown?.find(
                          (p) => p.promoter_id === ep.promoter?.id
                        );
                        return (
                          <TableRow key={ep.id}>
                            <TableCell className="font-medium">
                              {ep.promoter?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{ep.promoter?.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="default">{ep.commission_type}</Badge>
                            </TableCell>
                            {config.canViewStats && (
                              <>
                                <TableCell>{promoterStats?.registrations || 0}</TableCell>
                                <TableCell>{promoterStats?.check_ins || 0}</TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-foreground-muted py-8">
                    No promoters assigned to this event
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          {config.canViewPhotos && (
            <TabsContent value="photos" className="space-y-4">
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Photo Album</h2>
                    {(config.role === "organizer" || config.role === "admin") && album && album.status !== "published" && photos.length > 0 && (
                      <Button 
                        variant="primary" 
                        onClick={handlePublishPhotos}
                        loading={publishingPhotos}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Publish Album
                      </Button>
                    )}
                  </div>
                  
                  {(config.role === "organizer" || config.role === "admin") && (
                    <div className="space-y-4">
                      <PhotoUploader 
                        eventId={eventId} 
                        onUploadComplete={loadPhotos}
                      />
                      
                      {album && (
                        <div className="flex items-center gap-2">
                          <Badge variant={album.status === "published" ? "success" : "secondary"}>
                            {album.status === "published" ? "Published" : "Draft"}
                          </Badge>
                          {album.published_at && (
                            <span className="text-sm text-foreground-muted">
                              Published {new Date(album.published_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo, index) => (
                        <div key={photo.id} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden bg-background-secondary">
                            <img
                              src={photo.thumbnail_url || photo.url}
                              alt={photo.caption || `Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {(config.role === "organizer" || config.role === "admin") && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {album?.cover_photo_id !== photo.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetCoverPhoto(photo.id)}
                                  className="text-white hover:bg-white/20"
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePhoto(photo.id)}
                                loading={deletingPhoto === photo.id}
                                className="text-white hover:bg-white/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {album?.cover_photo_id === photo.id && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="warning" className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Cover
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-foreground-muted">
                      {(config.role === "organizer" || config.role === "admin")
                        ? "No photos yet. Upload photos to create your event album."
                        : "No photos available yet."}
                    </div>
                  )}

                  {event.slug && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-foreground-muted mb-2">Public Photo Gallery:</p>
                      <Link 
                        href={`/p/${event.slug}`}
                        target="_blank"
                        className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                      >
                        {typeof window !== 'undefined' ? window.location.origin : ''}/p/{event.slug}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          {config.canViewSettings && (
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <h2 className="text-xl font-semibold text-foreground mb-4">Event Settings</h2>
                <div className="space-y-4">
                  {event.promoter_access_type && (
                    <div>
                      <div className="text-sm text-foreground-muted mb-2">Promoter Access</div>
                      <Badge variant="default">{event.promoter_access_type}</Badge>
                    </div>
                  )}
                  {config.role === "organizer" && (
                    <div className="flex items-center gap-2">
                      <Link href={`/app/organizer/events/${eventId}/invites`}>
                        <Button variant="secondary">
                          <QrCode className="h-4 w-4 mr-2" />
                          Manage Invite Codes
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      ) : (
        // No tabs - show simple layout (for promoter or minimal views)
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Date & Time</p>
                  <p className="text-sm text-foreground-muted">{formatDate(event.start_time)}</p>
                  {event.end_time && (
                    <p className="text-sm text-foreground-muted">Until {formatDate(event.end_time)}</p>
                  )}
                </div>
              </div>
              {event.venue && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Venue</p>
                    <p className="text-sm text-foreground-muted">{event.venue.name}</p>
                    {event.venue.address && (
                      <p className="text-sm text-foreground-muted">{event.venue.address}</p>
                    )}
                  </div>
                </div>
              )}
              {event.capacity && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Capacity</p>
                    <p className="text-sm text-foreground-muted">{event.capacity} attendees</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
            <p className="text-foreground-muted whitespace-pre-wrap">
              {event.description || "No description provided."}
            </p>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {config.canEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Event"
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="Event Name"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="URL Slug"
                    value={editForm.slug}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="event-slug"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/events/generate-slug", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ baseSlug: editForm.slug || editForm.name }),
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setEditForm((prev) => ({ ...prev, slug: data.slug }));
                      }
                    } catch (error) {
                      console.error("Failed to generate slug:", error);
                    }
                  }}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                Used in the event URL (e.g., /e/{editForm.slug || "event-slug"})
              </p>
            </div>
            <Textarea
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Start Time"
                type="datetime-local"
                value={editForm.start_time}
                onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
              />
              <Input
                label="End Time"
                type="datetime-local"
                value={editForm.end_time}
                onChange={(e) => setEditForm((prev) => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Capacity"
                type="number"
                value={editForm.capacity}
                onChange={(e) => setEditForm((prev) => ({ ...prev, capacity: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
              {(config.role === "venue" || config.role === "admin") && (
                <Select
                  label="Status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                    { value: "ended", label: "Ended" },
                  ]}
                />
              )}
            </div>
            {config.role === "admin" && organizers.length > 0 && (
              <Select
                label="Organizer"
                value={editForm.organizer_id}
                onChange={(e) => setEditForm((prev) => ({ ...prev, organizer_id: e.target.value }))}
                options={organizers.map((org) => ({
                  value: org.id,
                  label: org.name,
                }))}
                required
              />
            )}
            <Select
              label="Timezone"
              value={editForm.timezone}
              onChange={(e) => setEditForm((prev) => ({ ...prev, timezone: e.target.value }))}
              options={[
                { value: "America/New_York", label: "Eastern Time (ET)" },
                { value: "America/Chicago", label: "Central Time (CT)" },
                { value: "America/Denver", label: "Mountain Time (MT)" },
                { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
                { value: "America/Anchorage", label: "Alaska Time (AKT)" },
                { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
                { value: "America/Toronto", label: "Toronto (ET)" },
                { value: "America/Vancouver", label: "Vancouver (PT)" },
                { value: "Europe/London", label: "London (GMT/BST)" },
                { value: "Europe/Paris", label: "Paris (CET/CEST)" },
                { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
                { value: "Asia/Tokyo", label: "Tokyo (JST)" },
                { value: "Asia/Shanghai", label: "Shanghai (CST)" },
                { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" },
              ]}
              helperText="Timezone for event times"
            />
            
            {config.role === "venue" && (
              <Textarea
                label="Reason for Changes (Optional)"
                value={editForm.reason}
                onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Explain why you're making these changes..."
              />
            )}

            {/* Flier Upload */}
            <div className="border-t border-border pt-6">
              <EventImageUpload
                label="Event Flier"
                aspectRatio="9:16"
                currentImageUrl={event?.flier_url}
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  const response = await fetch(`/api/organizer/events/${eventId}/flier`, {
                    method: "POST",
                    body: formData,
                  });
                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Failed to upload flier");
                  }
                  const data = await response.json();
                  await loadEventData(false); // Refresh event data without resetting form
                  return data.flier_url;
                }}
                onRemove={async () => {
                  // Delete flier via DELETE endpoint
                  const response = await fetch(`/api/organizer/events/${eventId}/flier`, {
                    method: "DELETE",
                  });
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to remove flier");
                  }
                  await loadEventData(false); // Refresh event data without resetting form
                }}
                helperText="Digital flier/poster for the event (9:16 portrait format required)"
              />
            </div>

            {/* Video Flier Upload */}
            <div className="border-t border-border pt-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-pink-400" />
                  <label className="text-sm font-medium text-foreground">
                    Video Flier (Optional)
                  </label>
                  <Badge variant="secondary" className="text-xs">Premium</Badge>
                </div>
                <p className="text-xs text-foreground-muted">
                  Upload a video flier (9:16 format, max 30 seconds, 100MB). Shown instead of static image on mobile.
                </p>
                
                {videoUploadSuccess && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Video saved successfully!
                  </div>
                )}
                
                {event?.flier_video_url ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[9/16] max-w-[200px] rounded-lg overflow-hidden bg-black">
                      <video
                        src={event.flier_video_url}
                        className="w-full h-full object-contain"
                        controls
                        muted
                        playsInline
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowRemoveVideoModal(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove Video
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {uploadingVideo ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20">
                        <InlineSpinner size="md" className="text-primary" />
                        <span className="text-sm text-primary font-medium">Uploading video...</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
                          id="video-flier-upload"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Validate size client-side
                            if (file.size > 100 * 1024 * 1024) {
                              alert("Video must be under 100MB");
                              e.target.value = "";
                              return;
                            }
                            
                            // Warn if file is large on mobile
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS && file.size > 30 * 1024 * 1024) {
                              const proceed = confirm(
                                `Large video files (${Math.round(file.size / 1024 / 1024)}MB) may fail to upload on mobile devices. ` +
                                `For best results, try uploading from a desktop browser or use a smaller file. Continue anyway?`
                              );
                              if (!proceed) {
                                e.target.value = "";
                                return;
                              }
                            }
                            
                            const formData = new FormData();
                            formData.append("file", file);
                            
                            setUploadingVideo(true);
                            setVideoUploadSuccess(false);
                            try {
                              const response = await fetch(`/api/organizer/events/${eventId}/video-flier`, {
                                method: "POST",
                                body: formData,
                              });
                              if (!response.ok) {
                                let errorMessage = "Failed to upload video";
                                try {
                                  const error = await response.json();
                                  errorMessage = error.error || errorMessage;
                                } catch {
                                  // Response wasn't JSON (network error)
                                  if (response.status === 0 || !response.status) {
                                    errorMessage = "Upload failed - please check your internet connection and try again. For large files, try using a desktop browser.";
                                  }
                                }
                                throw new Error(errorMessage);
                              }
                              await loadEventData(false);
                              setVideoUploadSuccess(true);
                              // Auto-hide success after 3 seconds
                              setTimeout(() => setVideoUploadSuccess(false), 3000);
                            } catch (error: any) {
                              // Better error message for common iOS failures
                              let message = error.message || "Failed to upload video";
                              if (message.includes("Load failed") || message.includes("load failed") || message.includes("Failed to fetch")) {
                                message = "Upload failed - this can happen with large files on mobile. Please try a smaller file or upload from a desktop browser.";
                              }
                              alert(message);
                            } finally {
                              setUploadingVideo(false);
                            }
                            
                            // Reset input
                            e.target.value = "";
                          }}
                        />
                        <label
                          htmlFor="video-flier-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <Upload className="h-4 w-4 text-foreground-muted" />
                          <span className="text-sm text-foreground-muted">Upload Video (MP4, WebM, MOV)</span>
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} loading={saving}>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit History Modal */}
      {config.showEditHistory && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title="Edit History"
          size="lg"
        >
          <div className="space-y-4">
            {editHistory.length === 0 ? (
              <div className="text-center py-8 text-foreground-muted">
                No edit history available
              </div>
            ) : (
              <div className="space-y-4">
                {editHistory.map((record) => (
                  <Card key={record.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{record.editor_email}</p>
                        <p className="text-xs text-foreground-muted">{record.editor_role}</p>
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    {record.reason && (
                      <p className="text-sm text-foreground-muted mb-2">Reason: {record.reason}</p>
                    )}
                    <div className="space-y-1">
                      {Object.entries(record.changes).map(([key, change]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{" "}
                          <span className="text-foreground-muted line-through">{String(change.old)}</span>{" "}
                          → <span className="text-foreground">{String(change.new)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Door Staff Modal */}
      {config.canManageDoorStaff && event && (
        <DoorStaffModal
          isOpen={showDoorStaffModal}
          onClose={() => setShowDoorStaffModal(false)}
          eventId={event.id}
          eventName={event.name}
          venueId={event.venue_id || undefined}
          organizerId={event.organizer_id || undefined}
        />
      )}

      {/* Promoter Management Modal */}
      {config.canManagePromoters && event && (
        <PromoterManagementModal
          isOpen={showPromoterModal}
          onClose={() => setShowPromoterModal(false)}
          eventId={event.id}
          context={config.role === "venue" ? "venue" : "organizer"}
          onUpdate={loadEventData}
        />
      )}

      {/* Approval Modal */}
      {config.canApprove && (
        <Modal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          title={approvalAction === "approve" ? "Approve Event" : "Reject Event"}
        >
          <div className="space-y-4">
            {approvalAction === "approve" ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Approve this event?</p>
                  <p className="text-sm text-foreground-muted mt-1">
                    Both the venue admins and the event organizer will be notified of this approval.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20">
                  <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Reject this event?</p>
                    <p className="text-sm text-foreground-muted mt-1">
                      Both the venue admins and the event organizer will be notified of this rejection.
                    </p>
                  </div>
                </div>
                <Textarea
                  label="Rejection Reason (optional)"
                  placeholder="Explain why this event is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowApprovalModal(false)}
                disabled={approving}
              >
                Cancel
              </Button>
              <Button
                variant={approvalAction === "approve" ? "primary" : "destructive"}
                onClick={handleApproval}
                disabled={approving}
                loading={approving}
              >
                {approvalAction === "approve" ? "Approve Event" : "Reject Event"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove Video Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveVideoModal}
        onClose={() => setShowRemoveVideoModal(false)}
        onConfirm={async () => {
          setRemovingVideo(true);
          try {
            const response = await fetch(`/api/organizer/events/${eventId}/video-flier`, {
              method: "DELETE",
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to remove video");
            }
            await loadEventData(false);
          } catch (error: any) {
            console.error("Failed to remove video:", error);
          } finally {
            setRemovingVideo(false);
          }
        }}
        title="Remove Video Flier"
        message="Are you sure you want to remove this video? This action cannot be undone."
        confirmText="Remove Video"
        cancelText="Keep Video"
        variant="danger"
        loading={removingVideo}
      />
    </div>
  );
}

