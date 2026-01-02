"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
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
  useToast,
} from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

// Types for event permissions
interface EventPermissions {
  hasAccess: boolean;
  isOwner: boolean;
  isSuperadmin: boolean;
  accessSource: string;
  permissions: {
    full_admin: boolean;
    edit_events: boolean;
    manage_promoters: boolean;
    view_reports: boolean;
    view_settings: boolean;
    closeout_event: boolean;
    manage_door_staff: boolean;
    view_financials: boolean;
    publish_photos: boolean;
    manage_payouts: boolean;
  };
}
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
  Check,
  Globe,
  EyeOff,
  Trash2,
  Star,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload,
  Download,
  Link as LinkIcon,
  Share,
  Play,
  X,
  Trophy,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { DoorStaffModal } from "@/components/DoorStaffModal";
import { PromoterManagementModal } from "@/components/PromoterManagementModal";
import { PhotoUploader } from "@/components/PhotoUploader";
import { PhotoGrid } from "@/components/PhotoGrid";
import { EmailStats } from "@/components/EmailStats";
import { BeautifiedQRCode } from "@/components/BeautifiedQRCode";
import { EventImageUpload } from "@/components/EventImageUpload";
import { EventLineupManagement } from "@/components/EventLineupManagement";
import { Surface } from "@/components/foundation/Surface";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { VENUE_EVENT_GENRES } from "@/lib/constants/genres";
import { EventStatusStepper, type EventStatus } from "@/components/EventStatusStepper";

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
  owner_user_id: string | null; // The user who owns this event
  venue_approval_status?: string | null;
  venue_approval_at?: string | null;
  venue_rejection_reason?: string | null;
  show_photo_email_notice?: boolean;
  is_featured?: boolean;
  created_at: string;
  organizer?: { id: string; name: string; email: string | null };
  venue?: { id: string; name: string; slug?: string | null; address: string | null; city: string | null };
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
  leaderboard_position?: number;
  total_promoters?: number;
  // Overall event stats (for promoters to see context)
  event_total_registrations?: number;
  event_total_checkins?: number;
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
  const [isPromoterView, setIsPromoterView] = useState(config.role === "promoter");
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
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadSuccess, setVideoUploadSuccess] = useState(false);
  const [showRemoveVideoModal, setShowRemoveVideoModal] = useState(false);
  const [removingVideo, setRemovingVideo] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [togglingFeatured, setTogglingFeatured] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteQRCode[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [publishingPhotos, setPublishingPhotos] = useState(false);
  const [unpublishingPhotos, setUnpublishingPhotos] = useState(false);
  const [showUnpublishForUploadModal, setShowUnpublishForUploadModal] = useState(false);
  const [pendingUploadResolver, setPendingUploadResolver] = useState<((value: boolean) => void) | null>(null);
  const [showRepublishPrompt, setShowRepublishPrompt] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [promoterRequests, setPromoterRequests] = useState<Array<{
    id: string;
    promoter_id: string;
    promoter: { id: string; name: string; email: string | null; phone?: string | null };
    message: string | null;
    status: string;
    created_at: string;
  }>>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [eventTags, setEventTags] = useState<Array<{ id: string; tag_type: string; tag_value: string }>>([]);
  const [savingTags, setSavingTags] = useState(false);
  
  // Photo confirmation modals
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAllPhotos, setDeletingAllPhotos] = useState(false);
  
  // Toast notifications
  const toast = useToast();
  
  // Referral state (for promoters and organizers)
  const [promoterId, setPromoterId] = useState<string | null>(null);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

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
    show_photo_email_notice: false,
    registration_type: "guestlist" as "guestlist" | "display_only" | "external_link",
    external_ticket_url: "",
  });

  // Ownership transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string } | null>(null);

  // Fetch dynamic user permissions for this event
  const { data: eventPermissions } = useSWR<EventPermissions>(
    `/api/events/${eventId}/my-permissions`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Compute effective permissions by merging config with dynamic permissions
  // Use OR logic: user has permission if EITHER config grants it OR API grants it
  // This ensures admin role pages still work even if API doesn't recognize the user
  const effectivePermissions = useMemo(() => {
    const perms = eventPermissions?.permissions;
    const apiHasAccess = eventPermissions?.hasAccess ?? false;
    const apiIsSuperadmin = eventPermissions?.isSuperadmin ?? false;
    
    // If API says user is superadmin/admin, they have all permissions
    if (apiIsSuperadmin) {
      return {
        canEdit: true,
        canManagePromoters: true,
        canManageDoorStaff: true,
        canViewSettings: true,
        canCloseoutEvent: true,
        canViewFinancials: true,
        canPublishPhotos: true,
        isOwner: eventPermissions?.isOwner ?? false,
        isSuperadmin: true,
      };
    }
    
    // Otherwise, use OR logic: config permission OR API permission
    return {
      canEdit: (config.canEdit ?? false) || (perms?.edit_events ?? false),
      canManagePromoters: (config.canManagePromoters ?? false) || (perms?.manage_promoters ?? false),
      canManageDoorStaff: (config.canManageDoorStaff ?? false) || (perms?.manage_door_staff ?? false),
      canViewSettings: (config.canViewSettings ?? false) || (perms?.view_settings ?? false),
      canCloseoutEvent: perms?.closeout_event ?? false,
      canViewFinancials: perms?.view_financials ?? false,
      canPublishPhotos: perms?.publish_photos ?? false,
      isOwner: eventPermissions?.isOwner ?? false,
      isSuperadmin: false,
    };
  }, [eventPermissions, config.canEdit, config.canManagePromoters, config.canManageDoorStaff, config.canViewSettings]);

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
    // Load promoter requests for organizers and venues
    if (config.canManagePromoters) {
      loadPromoterRequests();
    }
    
    // Refresh stats every 30 seconds if viewing stats
    if (config.canViewStats && config.statsApiEndpoint) {
      const statsInterval = setInterval(loadStats, 30000);
      return () => clearInterval(statsInterval);
    }
  }, [eventId, config]);

  // Load promoter ID for referral link generation
  useEffect(() => {
    if (config.role === "promoter") {
      const loadPromoterId = async () => {
        try {
          const response = await fetch("/api/me/promoter-status");
          if (response.ok) {
            const data = await response.json();
            if (data.promoterId) {
              setPromoterId(data.promoterId);
            }
          }
        } catch (error) {
          console.error("Failed to load promoter ID:", error);
        }
      };
      loadPromoterId();
    }
  }, [config.role]);

  // Load leaderboard when tab is selected
  useEffect(() => {
    if (activeTab === "leaderboard" && event && leaderboard.length === 0 && !loadingLeaderboard) {
      const loadLeaderboard = async () => {
        setLoadingLeaderboard(true);
        try {
          const response = await fetch(`/api/events/${event.id}/leaderboard`);
          if (response.ok) {
            const data = await response.json();
            setLeaderboard(data.leaderboard || []);
          }
        } catch (error) {
          console.error("Failed to load leaderboard:", error);
        } finally {
          setLoadingLeaderboard(false);
        }
      };
      loadLeaderboard();
    }
  }, [activeTab, event, leaderboard.length, loadingLeaderboard]);

  // Generate referral link for promoter
  // Get referral code based on role
  const getReferralCode = () => {
    if (config.role === "promoter" && promoterId) {
      return promoterId;
    }
    if (config.role === "organizer" && organizerId) {
      return `org_${organizerId}`;
    }
    return null;
  };

  const getReferralLink = () => {
    const refCode = getReferralCode();
    if (!refCode || !event) return "";
    let webUrl = "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (origin.includes("app.crowdstack.app")) {
        webUrl = origin.replace("app.crowdstack.app", "crowdstack.app");
      } else if (origin.includes("app-beta.crowdstack.app")) {
        webUrl = origin.replace("app-beta.crowdstack.app", "beta.crowdstack.app");
      } else {
        webUrl = origin;
      }
    }
    return `${webUrl}/e/${event.slug}/register?ref=${refCode}`;
  };

  // Generate QR code URL (deprecated - using BeautifiedQRCode component instead)
  const getQRCodeUrl = () => {
    const link = getReferralLink();
    if (!link) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&bgcolor=ffffff&color=000000&margin=10`;
  };

  // Copy referral link
  const copyReferralLink = () => {
    const link = getReferralLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const loadEventTags = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/tags`);
      if (response.ok) {
        const data = await response.json();
        setEventTags(data.tags || []);
      }
    } catch (error) {
      console.error("Failed to load event tags:", error);
    }
  };

  const handleTagToggle = async (tagValue: string) => {
    if (!effectivePermissions.canEdit) return;
    
    const existingTag = eventTags.find((t) => t.tag_type === "music" && t.tag_value === tagValue);
    setSavingTags(true);

    try {
      if (existingTag) {
        // Remove tag
        await fetch(`/api/events/${eventId}/tags?tagId=${existingTag.id}`, {
          method: "DELETE",
        });
        setEventTags(eventTags.filter((t) => t.id !== existingTag.id));
      } else {
        // Add tag
        const response = await fetch(`/api/events/${eventId}/tags`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_type: "music", tag_value: tagValue }),
        });
        if (response.ok) {
          const data = await response.json();
          setEventTags([...eventTags, data.tag]);
        }
      }
    } catch (error) {
      console.error("Failed to toggle tag:", error);
    } finally {
      setSavingTags(false);
    }
  };

  const loadEventData = async (resetForm = true) => {
    try {
      const response = await fetch(config.eventApiEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log("Event data loaded:", data.event?.name, "Promoters:", data.event?.event_promoters?.length, data.event?.event_promoters);
        
        // Auto-update status to "ended" if end_time has passed and status is "published"
        if (data.event?.status === "published" && data.event?.end_time) {
          const endTime = new Date(data.event.end_time);
          const now = new Date();
          if (endTime < now) {
            // Automatically update status to "ended"
            try {
              const updateResponse = await fetch(config.eventApiEndpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ended" }),
              });
              if (updateResponse.ok) {
                const updatedData = await updateResponse.json();
                data.event = updatedData.event; // Update local data
                console.log("Auto-updated event status to 'ended'");
              }
            } catch (updateError) {
              console.error("Failed to auto-update event status:", updateError);
              // Continue with original data even if update fails
            }
          }
        }
        
        setEvent(data.event);
        // Load event tags
        loadEventTags();
        // Set organizer ID for organizer role (for their own referral link)
        if (config.role === "organizer" && data.event.organizer_id) {
          setOrganizerId(data.event.organizer_id);
        }
        // Only reset the form if requested (don't reset during image uploads while modal is open)
        if (effectivePermissions.canEdit && resetForm) {
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
            show_photo_email_notice: Boolean(data.event.show_photo_email_notice),
            registration_type: (data.event.registration_type as "guestlist" | "display_only" | "external_link") || "guestlist",
            external_ticket_url: data.event.external_ticket_url || "",
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
    if (!config.statsApiEndpoint) {
      console.log("No stats endpoint configured");
      return;
    }
    try {
      console.log("Loading stats from:", config.statsApiEndpoint);
      const response = await fetch(config.statsApiEndpoint);
      if (response.ok) {
        const data = await response.json();
        console.log("Stats loaded:", data);
        setStats(data);
      } else {
        console.error("Stats API returned error:", response.status, await response.text());
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
      
      // Handle show_photo_email_notice - compare boolean values properly
      const currentPhotoNotice = Boolean(event.show_photo_email_notice);
      if (editForm.show_photo_email_notice !== currentPhotoNotice) {
        updates.show_photo_email_notice = editForm.show_photo_email_notice;
        console.log("[EventEdit] Photo email notice changed:", {
          from: currentPhotoNotice,
          to: editForm.show_photo_email_notice,
          eventValue: event.show_photo_email_notice,
        });
      }

      // Registration type and external ticket URL
      if (editForm.registration_type !== ((event as any).registration_type || "guestlist")) {
        updates.registration_type = editForm.registration_type;
      }
      if (editForm.external_ticket_url !== ((event as any).external_ticket_url || "")) {
        updates.external_ticket_url = editForm.external_ticket_url || null;
      }

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

  const handleFeaturedToggle = async () => {
    if (!event) return;

    setTogglingFeatured(true);
    try {
      const response = await fetch(config.eventApiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !event.is_featured }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update featured status");
      }

      await loadEventData();
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setTogglingFeatured(false);
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

  const loadPromoterRequests = async () => {
    console.log("Loading promoter requests for event:", eventId);
    try {
      const response = await fetch(`/api/events/${eventId}/promoter-requests`);
      console.log("Promoter requests response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Promoter requests loaded:", data);
        setPromoterRequests(data.requests || []);
      } else {
        const errorData = await response.text();
        console.error("Failed to load promoter requests:", response.status, errorData);
      }
    } catch (error) {
      console.error("Failed to load promoter requests:", error);
    }
  };

  const handlePromoterRequest = async (requestId: string, action: "approve" | "decline") => {
    try {
      setProcessingRequest(requestId);
      const response = await fetch(`/api/events/${eventId}/promoter-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      const data = await response.json();
      console.log(`Promoter request ${action} response:`, data);
      
      if (response.ok) {
        // Remove the request from the list
        setPromoterRequests((prev) => prev.filter((r) => r.id !== requestId));
        // If approved, reload event data to get updated promoters list
        if (action === "approve") {
          console.log("Reloading event data after approval...");
          await loadEventData(false);
          console.log("Event data reloaded");
        }
      } else {
        alert(data.error || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      alert(`Failed to ${action} request`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRemovePromoter = async (eventPromoterId: string) => {
    if (!confirm("Are you sure you want to remove this promoter from the event?")) {
      return;
    }
    try {
      const response = await fetch(`/api/events/${eventId}/promoters`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventPromoterId }),
      });
      if (response.ok) {
        await loadEventData(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to remove promoter");
      }
    } catch (error) {
      console.error("Error removing promoter:", error);
      alert("Failed to remove promoter");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setShowDeletePhotoConfirm(null);
    setDeletingPhoto(photoId);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/${photoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (album?.cover_photo_id === photoId) {
          setAlbum((prev) => (prev ? { ...prev, cover_photo_id: null } : null));
        }
        toast.success("Photo Deleted", "The photo has been removed");
      } else {
        toast.error("Delete Failed", "Could not delete the photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Delete Failed", "An unexpected error occurred");
    } finally {
      setDeletingPhoto(null);
    }
  };

  const handleDeleteAllPhotos = async () => {
    if (photos.length === 0) return;
    
    setDeletingAllPhotos(true);
    try {
      const photoIds = photos.map((p) => p.id);
      const response = await fetch(`/api/events/${eventId}/photos/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          photoIds,
        }),
      });

      if (response.ok) {
        setPhotos([]);
        if (album?.cover_photo_id) {
          setAlbum((prev) => (prev ? { ...prev, cover_photo_id: null } : null));
        }
        toast.success("All Photos Deleted", `${photoIds.length} photos have been removed`);
        setShowDeleteAllConfirm(false);
      } else {
        const data = await response.json();
        toast.error("Delete Failed", data.error || "Could not delete all photos");
      }
    } catch (error) {
      console.error("Error deleting all photos:", error);
      toast.error("Delete Failed", "An unexpected error occurred");
    } finally {
      setDeletingAllPhotos(false);
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
        toast.success("Cover Photo Set", "Album cover updated");
      } else {
        toast.error("Failed", "Could not set cover photo");
      }
    } catch (error) {
      console.error("Error setting cover photo:", error);
      toast.error("Failed", "Could not set cover photo");
    }
  };

  const handlePublishPhotos = async () => {
    if (!album) return;
    setShowPublishConfirm(false);

    setPublishingPhotos(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/publish`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        await loadPhotos();
        
        // Show success toast with details
        if (data.auto_email_enabled) {
          if (data.emails_skipped && data.skip_reason) {
            toast.warning("Photos Published", data.skip_reason);
          } else if (data.emails_sent > 0) {
            const failedMsg = data.emails_failed > 0 ? ` (${data.emails_failed} failed)` : "";
            toast.success("Photos Published", `${data.emails_sent} attendees notified${failedMsg}`);
          } else {
            toast.success("Photos Published", "No attendees to notify");
          }
        } else {
          toast.success("Photos Published", "Album is now visible to attendees");
        }
      } else {
        const data = await response.json();
        toast.error("Failed to Publish", data.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error publishing photos:", error);
      toast.error("Failed to Publish", "An unexpected error occurred");
    } finally {
      setPublishingPhotos(false);
    }
  };

  const handleUnpublishPhotos = async () => {
    if (!album) return;
    setShowUnpublishConfirm(false);

    setUnpublishingPhotos(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/publish`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadPhotos();
        toast.success("Photos Unpublished", "The gallery is now hidden from public view");
      } else {
        const data = await response.json();
        toast.error("Failed to Unpublish", data.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error unpublishing photos:", error);
      toast.error("Failed to Unpublish", "An unexpected error occurred");
    } finally {
      setUnpublishingPhotos(false);
    }
  };

  // Called by PhotoUploader when album is published and user tries to upload
  const handleNeedUnpublishForUpload = (): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingUploadResolver(() => resolve);
      setShowUnpublishForUploadModal(true);
    });
  };

  const handleConfirmUnpublishForUpload = async () => {
    setUnpublishingPhotos(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/publish`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadPhotos();
        setShowUnpublishForUploadModal(false);
        setShowRepublishPrompt(true); // Show republish prompt after uploads complete
        if (pendingUploadResolver) {
          pendingUploadResolver(true);
          setPendingUploadResolver(null);
        }
        toast.info("Album Unpublished", "You can now add photos");
      } else {
        const data = await response.json();
        toast.error("Failed to Unpublish", data.error || "An error occurred");
        if (pendingUploadResolver) {
          pendingUploadResolver(false);
          setPendingUploadResolver(null);
        }
      }
    } catch (error) {
      console.error("Error unpublishing photos:", error);
      toast.error("Failed to Unpublish", "An unexpected error occurred");
      if (pendingUploadResolver) {
        pendingUploadResolver(false);
        setPendingUploadResolver(null);
      }
    } finally {
      setUnpublishingPhotos(false);
    }
  };

  const handleCancelUnpublishForUpload = () => {
    setShowUnpublishForUploadModal(false);
    if (pendingUploadResolver) {
      pendingUploadResolver(false);
      setPendingUploadResolver(null);
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
        <h2 className="text-xl font-semibold text-primary mb-2">Event Not Found</h2>
        <p className="text-secondary mb-4">This event doesn't exist or you don't have access.</p>
        <Link href={config.backUrl}>
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </div>
    );
  }

  // Determine which tabs to show based on effective permissions
  const tabs: Array<{ value: string; label: string }> = [];
  if (config.canViewStats || config.role === "promoter") {
    tabs.push({ value: "overview", label: "Overview" });
  }
  if (config.canViewAttendees) {
    tabs.push({ value: "attendees", label: `Attendees (${attendees.length})` });
  }
  if (config.canViewPromoters || effectivePermissions.canManagePromoters) {
    tabs.push({ value: "promoters", label: "Promoters" });
  }
  // Leaderboard tab - show for promoters and organizers/venues with promoters
  if (config.role === "promoter" || config.canViewPromoters || effectivePermissions.canManagePromoters) {
    tabs.push({ value: "leaderboard", label: "Leaderboard" });
  }
  if (config.canViewPhotos) {
    tabs.push({ value: "media", label: "Media" });
    tabs.push({ value: "photos", label: "Photos" });
  }
  // Email Stats tab - show for organizers, venues, and admins
  if (config.role === "organizer" || config.role === "venue" || config.role === "admin") {
    tabs.push({ value: "email-stats", label: "Email Stats" });
  }
  // Settings tab - uses dynamic permissions
  if (effectivePermissions.canViewSettings) {
    tabs.push({ value: "settings", label: "Settings" });
  }
  // Lineup tab - show for those who can edit
  if (effectivePermissions.canEdit || config.role === "organizer" || config.role === "venue" || config.role === "admin") {
    tabs.push({ value: "lineup", label: "Lineup" });
  }

  return (
    <div className="relative min-h-screen">
      {/* Blurred Flyer Background */}
      {event.flier_url && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
            style={{
              backgroundImage: `url(${event.flier_url})`,
              filter: "blur(60px) saturate(1.2)",
              opacity: 0.15,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>
      )}

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Link href={config.backUrl}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
          </div>

          {/* Event Title with Status Badges on the right */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
              {event.name}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(event.status)}
              {config.showVenueApproval && getApprovalBadge(event.venue_approval_status)}
            </div>
          </div>

          {/* Action Buttons - On their own line */}
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
          {effectivePermissions.canManageDoorStaff && (
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
          {effectivePermissions.canEdit && (
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
          {config.canPublish && event && (() => {
            const needsVenueApproval = event.venue_id && event.venue_approval_status !== "approved";
            const isPublished = (event.status || "draft") === "published";
            
            if (isPublished) {
              return (
                <Button
                  variant="secondary"
                  onClick={handlePublishToggle}
                  disabled={publishing}
                  loading={publishing}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish Event
                </Button>
              );
            }
            
            if (needsVenueApproval) {
              return (
                <div className="relative group">
                  <Button
                    variant="secondary"
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Publish Event
                  </Button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-raised border border-border rounded-lg shadow-lg text-xs text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3 w-3 text-warning" />
                      <span>Requires venue approval before publishing</span>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <Button
                variant="primary"
                onClick={handlePublishToggle}
                disabled={publishing}
                loading={publishing}
              >
                <Globe className="h-4 w-4 mr-2" />
                Publish Event
              </Button>
            );
          })()}
          {/* Featured toggle - admin only */}
          {config.role === "admin" && event && (
            <Button
              variant={event.is_featured ? "primary" : "secondary"}
              onClick={handleFeaturedToggle}
              disabled={togglingFeatured}
              loading={togglingFeatured}
              className={event.is_featured ? "!bg-amber-500 hover:!bg-amber-600" : ""}
            >
              <Star className={`h-4 w-4 mr-2 ${event.is_featured ? "fill-current" : ""}`} />
              {event.is_featured ? "Featured" : "Feature"}
            </Button>
          )}
          {((config.role === "promoter" && promoterId) || (config.role === "organizer" && organizerId)) && (
            <>
              <Button variant="secondary" onClick={copyReferralLink}>
                {copiedReferral ? (
                  <Check className="h-4 w-4 mr-2 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copiedReferral ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="secondary" onClick={() => setShowQRModal(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                {config.role === "promoter" ? "My QR Code" : "Event QR"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Event Lifecycle Stepper - Show for organizers and admins */}
      {(config.role === "organizer" || config.role === "admin") && (
        <Card className="p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Event Lifecycle
            </span>
          </div>
          <EventStatusStepper
            status={(() => {
              // Compute effective status based on end_time
              const dbStatus = (event.status || "draft") as EventStatus;
              
              // If event is published and end_time has passed, show as "ended"
              if (dbStatus === "published" && event.end_time) {
                const endTime = new Date(event.end_time);
                const now = new Date();
                if (endTime < now) {
                  return "ended" as EventStatus;
                }
              }
              
              return dbStatus;
            })()}
            size="md"
            showLabels={true}
          />
        </Card>
      )}

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
              <div className="flex items-center gap-2 text-secondary mb-2">
                <Building2 className="h-4 w-4" />
                <span>{event.venue?.name || "Venue"}</span>
              </div>
              {event.venue_approval_status === "approved" && event.venue_approval_at && (
                <p className="text-sm text-secondary">
                  Approved on {formatApprovalDate(event.venue_approval_at)}
                </p>
              )}
              {event.venue_approval_status === "rejected" && (
                <div className="mt-2 p-3 bg-error/10 rounded-lg border border-error/20">
                  <p className="text-sm text-error font-medium">
                    {event.venue_rejection_reason || "No reason provided"}
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    You can edit the event and try a different venue.
                  </p>
                </div>
              )}
              {event.venue_approval_status === "pending" && (
                <p className="text-sm text-secondary">
                  The venue has been notified and will review your event soon. 
                  You'll receive a notification when they respond.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      {config.canViewStats && !stats && (
        <div className="text-center py-4 text-secondary text-sm">
          <InlineSpinner size="sm" /> Loading stats...
        </div>
      )}
      {config.canViewStats && stats && (
        <div className={`grid gap-4 ${
          config.role === "promoter" 
            ? "grid-cols-2 lg:grid-cols-4" 
            : "md:grid-cols-2 lg:grid-cols-4"
        }`}>
          {config.role === "promoter" ? (
            <>
              {/* Your Stats Section */}
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-wide">My Referrals</p>
                    <p className="text-3xl font-bold tracking-tighter text-primary mt-1">
                      {stats.referrals || 0}
                    </p>
                    {stats.event_total_registrations && stats.event_total_registrations > 0 && (
                      <p className="text-xs text-primary mt-1">
                        {Math.round(((stats.referrals || 0) / stats.event_total_registrations) * 100)}% of total
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-accent-secondary/20">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-wide">My Check-ins</p>
                    <p className="text-3xl font-bold tracking-tighter text-primary mt-1">
                      {stats.checkins || 0}
                    </p>
                    <p className="text-xs text-success mt-1">
                      {stats.conversionRate?.toFixed(0) || 0}% conversion
                    </p>
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-success/20">
                    <UserCheck className="h-6 w-6 text-success" />
                  </div>
                </div>
              </Card>
              
              {/* Leaderboard Position */}
              <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-secondary uppercase tracking-wide">Leaderboard</p>
                    <p className="text-3xl font-bold tracking-tighter text-primary mt-1">
                      #{stats.leaderboard_position || "-"}
                    </p>
                    {stats.total_promoters && (
                      <p className="text-xs text-warning mt-1">
                        of {stats.total_promoters} promoter{stats.total_promoters !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="h-12 w-12 flex items-center justify-center rounded-full bg-warning/20">
                    <Star className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </Card>

              {/* Overall Event Stats */}
              <Card className="bg-void/60 backdrop-blur-sm border-border/50">
                <div className="space-y-2">
                  <p className="text-xs text-secondary uppercase tracking-wide">Event Overall</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-lg font-bold text-primary">{stats.event_total_registrations || 0}</p>
                      <p className="text-xs text-secondary">Total Registered</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{stats.event_total_checkins || 0}</p>
                      <p className="text-xs text-secondary">Total Check-ins</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <div className="space-y-2">
                  <div className="text-sm text-secondary">Registrations</div>
                  <div className="text-3xl font-bold text-primary">
                    {stats.total_registrations || 0}
                  </div>
                  {stats.recent_registrations_24h !== undefined && (
                    <div className="text-xs text-secondary flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      +{stats.recent_registrations_24h} in last 24h
                    </div>
                  )}
                </div>
              </Card>
              <Card>
                <div className="space-y-2">
                  <div className="text-sm text-secondary">Check-ins</div>
                  <div className="text-3xl font-bold text-primary">
                    {stats.total_check_ins || 0}
                  </div>
                  {stats.total_registrations && stats.total_registrations > 0 && (
                    <div className="text-xs text-secondary flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      {Math.round(((stats.total_check_ins || 0) / stats.total_registrations) * 100)}% conversion
                    </div>
                  )}
                </div>
              </Card>
              {stats.capacity !== undefined && (
                <Card>
                  <div className="space-y-2">
                    <div className="text-sm text-secondary">Capacity</div>
                    <div className="text-3xl font-bold text-primary">
                      {stats.capacity ? `${stats.capacity_remaining}/${stats.capacity}` : "Unlimited"}
                    </div>
                    {stats.capacity && (
                      <div className="text-xs text-secondary">
                        {stats.capacity_percentage}% full
                      </div>
                    )}
                  </div>
                </Card>
              )}
              {event.event_promoters && (
                <Card>
                  <div className="space-y-2">
                    <div className="text-sm text-secondary">Promoters</div>
                    <div className="text-3xl font-bold text-primary">
                      {event.event_promoters.length}
                    </div>
                    <div className="text-xs text-secondary">
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
                {tab.value === "media" && <Video className="h-4 w-4 mr-1" />}
                {tab.value === "photos" && <ImageIcon className="h-4 w-4 mr-1" />}
                {tab.value === "email-stats" && <Mail className="h-4 w-4 mr-1" />}
                {tab.value === "leaderboard" && <Trophy className="h-4 w-4 mr-1" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Event Details */}
            <Card className="bg-void/60 backdrop-blur-sm border-border/50">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Flyer - Larger */}
                {event.flier_url && (
                  <div 
                    className="flex-shrink-0 w-full sm:w-40 md:w-48 aspect-[3/4] rounded-lg overflow-hidden border border-border/50 cursor-pointer hover:opacity-90 hover:scale-[1.02] transition-all shadow-lg"
                    onClick={() => window.open(event.flier_url!, "_blank")}
                  >
                    <img
                      src={event.flier_url}
                      alt={`${event.name} flyer`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Details Grid - Compact */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-primary mb-3">Event Details</h2>
                  
                  {/* Compact Info Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    {/* Start */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-secondary text-xs">Start</div>
                        <div className="text-primary truncate">{new Date(event.start_time).toLocaleDateString()}</div>
                        <div className="text-secondary text-xs">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    
                    {/* End */}
                    {event.end_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-secondary text-xs">End</div>
                          <div className="text-primary truncate">{new Date(event.end_time).toLocaleDateString()}</div>
                          <div className="text-secondary text-xs">{new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Timezone */}
                    {event.timezone && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-secondary text-xs">Timezone</div>
                          <div className="text-primary truncate">{event.timezone}</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Venue */}
                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-secondary text-xs">Venue</div>
                          {event.venue.slug && event.venue.slug.trim() !== "" ? (
                            <Link 
                              href={`/venues/${event.venue.slug}`}
                              target="_blank"
                              className="text-primary hover:underline font-medium truncate block"
                            >
                              {event.venue.name}
                            </Link>
                          ) : (
                            <div className="text-primary font-medium truncate">{event.venue.name}</div>
                          )}
                          {event.venue.address && (
                            <div className="text-secondary text-xs truncate">{event.venue.address}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Organizer */}
                    {event.organizer && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-secondary text-xs">Organizer</div>
                          <div className="text-primary truncate">{event.organizer.name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Description - Below the grid */}
                  {event.description && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-sm text-secondary line-clamp-3">{event.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Share Links and Charts - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Share Event Card */}
              <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 backdrop-blur-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Share className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-primary">Share Event</h2>
                  </div>

                  {/* Your Tracking Link (for promoters and organizers) */}
                  {((config.role === "promoter" && promoterId) || (config.role === "organizer" && organizerId)) && (
                    <div className="space-y-3 p-3 bg-accent-secondary/5 rounded-lg border border-accent-secondary/20">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-primary">
                          {config.role === "promoter" ? "Your Referral Link" : "Your Tracking Link"}
                        </div>
                        <Badge variant="secondary" className="bg-accent-secondary/20 text-primary text-xs">
                          {config.role === "promoter" ? "Earn commissions" : "Track referrals"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-void rounded border border-primary/30 overflow-hidden">
                          <LinkIcon className="h-3 w-3 text-primary flex-shrink-0" />
                          <code className="text-xs text-primary truncate">{getReferralLink()}</code>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={copyReferralLink}
                        >
                          {copiedReferral ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedReferral ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            const link = getReferralLink();
                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: event.name,
                                  text: `Check out ${event.name}!`,
                                  url: link,
                                });
                              } catch {
                                // User cancelled or share failed
                              }
                            } else {
                              navigator.clipboard.writeText(link);
                              setCopiedReferral(true);
                              setTimeout(() => setCopiedReferral(false), 2000);
                            }
                          }}
                        >
                          <Share className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowQRModal(true)}
                        >
                          <QrCode className="h-3 w-3 mr-1" />
                          QR
                        </Button>
                      </div>
                      
                      {/* Compact Referral Explainer */}
                      <div className="pt-2 border-t border-primary/10">
                        <p className="text-xs text-secondary">
                          {config.role === "promoter" 
                            ? "Share to earn commissions when referrals attend" 
                            : "Track registrations from your personal shares"}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Public Event URL */}
                  {eventUrl && (
                    <div className="space-y-2">
                      <div className="text-xs text-secondary">
                        {(config.role === "promoter" || config.role === "organizer") ? "Direct Link (no tracking)" : "Public Event Page"}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-void rounded border border-border overflow-hidden">
                          <LinkIcon className="h-3 w-3 text-secondary flex-shrink-0" />
                          <code className="text-xs text-primary truncate">{eventUrl}</code>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(eventUrl)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(eventUrl, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Activity Chart - For all roles */}
              <Card className="bg-void/60 backdrop-blur-sm border-border/50">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  {config.role === "promoter" ? "Your Referral Activity" : "Event Activity"}
                </h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" stroke="var(--color-foreground-muted)" fontSize={12} />
                      <YAxis stroke="var(--color-foreground-muted)" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "var(--color-background)", 
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px"
                        }} 
                      />
                      <Line type="monotone" dataKey="registrations" stroke="#8884d8" name="Registrations" strokeWidth={2} />
                      <Line type="monotone" dataKey="checkins" stroke="#10b981" name="Check-ins" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-secondary">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity data yet</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Promoter Performance Chart (for organizer/venue only) */}
            {config.role !== "promoter" && config.canViewStats && stats?.promoter_breakdown && stats.promoter_breakdown.length > 0 && (
              <Card className="bg-void/60 backdrop-blur-sm border-border/50">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Promoter Performance
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.promoter_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="promoter_name" stroke="var(--color-foreground-muted)" fontSize={12} />
                    <YAxis stroke="var(--color-foreground-muted)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--color-background)", 
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px"
                      }} 
                    />
                    <Bar dataKey="registrations" fill="#8884d8" name="Registrations" />
                    <Bar dataKey="check_ins" fill="#10b981" name="Check-ins" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>

          {config.canViewAttendees && (
            <TabsContent value="attendees" className="space-y-4">
              {/* Invite/Tracking QR Codes Section (for organizers) */}
              {config.role === "organizer" && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">Tracking QR Codes</h2>
                      <p className="text-sm text-secondary mt-1">Create QR codes with unique tracking links for promoters, flyers, or campaigns</p>
                    </div>
                    <Link href={`/app/organizer/events/${eventId}/invites`}>
                      <Button variant="secondary" size="sm">
                        <QrCode className="h-4 w-4 mr-2" />
                        {inviteCodes.length > 0 ? "Manage QR Codes" : "Create QR Code"}
                      </Button>
                    </Link>
                  </div>
                  {inviteCodes.length > 0 ? (
                    <>
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
                            <div className="text-xs text-secondary space-y-1">
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
                              View all {inviteCodes.length} QR codes
                            </Button>
                          </Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg">
                      <QrCode className="h-8 w-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-secondary">No tracking QR codes yet</p>
                      <p className="text-xs text-muted mt-1">Create QR codes to track registrations from different sources</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Attendee Stats Summary */}
              {attendeeStats && !isPromoterView && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{attendeeStats.total}</div>
                    <div className="text-sm text-secondary">Total Registered</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-success">{attendeeStats.checked_in}</div>
                    <div className="text-sm text-secondary">Checked In</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-warning">{attendeeStats.not_checked_in}</div>
                    <div className="text-sm text-secondary">Not Checked In</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-info">{attendeeStats.by_source.direct}</div>
                    <div className="text-sm text-secondary">Direct</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-primary">{attendeeStats.by_source.promoter}</div>
                    <div className="text-sm text-secondary">Via Promoters</div>
                  </Card>
                </div>
              )}

              {/* Promoter View Header */}
              {isPromoterView && (
                <Card className="mb-4 p-4 bg-accent-secondary/10 border-accent-secondary/20">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-primary">Your Referrals</h3>
                      <p className="text-sm text-secondary">
                        Showing only guests you brought to this event
                      </p>
                    </div>
                  </div>
                  {attendeeStats && (
                    <div className="flex gap-6 mt-4">
                      <div>
                        <span className="text-2xl font-bold text-primary">{attendeeStats.total}</span>
                        <span className="text-sm text-secondary ml-2">registered</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-success">{attendeeStats.checked_in}</span>
                        <span className="text-sm text-secondary ml-2">checked in</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold text-primary">
                          {attendeeStats.total > 0 ? Math.round((attendeeStats.checked_in / attendeeStats.total) * 100) : 0}%
                        </span>
                        <span className="text-sm text-secondary ml-2">conversion</span>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Card>
                {/* Header with title and search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-semibold text-primary">
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
                    <p className="text-sm text-secondary">
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
                        <TableCell colSpan={isPromoterView ? 5 : 6} className="text-center text-secondary py-8">
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
                                <span className="text-secondary text-sm">Direct</span>
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
              {/* Pending Promoter Requests */}
              {/* Debug: Show request count */}
              {effectivePermissions.canManagePromoters && (
                <div className="text-xs text-secondary mb-2">
                  Total requests loaded: {promoterRequests.length} | Pending: {promoterRequests.filter(r => r.status === "pending").length}
                </div>
              )}
              
              {config.canManagePromoters && promoterRequests.filter(r => r.status === "pending").length > 0 && (
                <Card className="border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <h2 className="text-base font-semibold text-primary">
                      Pending Requests ({promoterRequests.filter(r => r.status === "pending").length})
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {promoterRequests
                      .filter((r) => r.status === "pending")
                      .map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-2 bg-void rounded-lg border border-border"
                        >
                          {/* Promoter Info - Compact */}
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 text-sm">
                            <div>
                              <span className="font-medium text-primary">
                                {request.promoter?.name || "Unknown"}
                              </span>
                              <span className="text-secondary text-xs ml-2">
                                {new Date(request.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-secondary truncate">
                              {request.promoter?.email && (
                                <a href={`mailto:${request.promoter.email}`} className="hover:text-primary">
                                  {request.promoter.email}
                                </a>
                              )}
                            </div>
                            <div className="text-secondary">
                              {request.promoter?.phone && (
                                <a href={`tel:${request.promoter.phone}`} className="hover:text-primary">
                                  {request.promoter.phone}
                                </a>
                              )}
                            </div>
                          </div>
                          {request.message && (
                            <div className="hidden lg:block text-xs text-secondary italic max-w-[200px] truncate" title={request.message}>
                              &quot;{request.message}&quot;
                            </div>
                          )}
                          {/* Actions */}
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handlePromoterRequest(request.id, "approve")}
                              loading={processingRequest === request.id}
                              disabled={processingRequest !== null}
                              className="px-2 py-1 text-xs"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePromoterRequest(request.id, "decline")}
                              loading={processingRequest === request.id}
                              disabled={processingRequest !== null}
                              className="px-2 py-1 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {/* Assigned Promoters */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-primary">Assigned Promoters</h2>
                  <div className="flex gap-2">
                    {effectivePermissions.canManagePromoters && (
                      <Button variant="primary" onClick={() => setShowPromoterModal(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Promoter
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
                        {effectivePermissions.canManagePromoters && (
                          <TableHead className="w-16">Actions</TableHead>
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
                              <Badge variant="default">{ep.commission_type?.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            {config.canViewStats && (
                              <>
                                <TableCell>{promoterStats?.registrations || 0}</TableCell>
                                <TableCell>{promoterStats?.check_ins || 0}</TableCell>
                              </>
                            )}
                            {effectivePermissions.canManagePromoters && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemovePromoter(ep.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-secondary py-8">
                    No promoters assigned to this event yet.
                    {effectivePermissions.canManagePromoters && (
                      <p className="text-sm mt-2">
                        Click &quot;Add Promoter&quot; to assign promoters, or wait for promoters to request access.
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          {/* Media Tab */}
          {config.canViewPhotos && (
            <TabsContent value="media" className="space-y-6">
              <Card className="bg-void/60 backdrop-blur-sm border-border/50">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-primary">Event Media</h2>
                  
                  {/* Flyer Section */}
                  {event.flier_url ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-secondary">Event Flyer</h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full sm:w-64 aspect-[3/4] rounded-lg overflow-hidden border border-border bg-void">
                          <img
                            src={event.flier_url}
                            alt={`${event.name} flyer`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => window.open(event.flier_url!, "_blank")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Size
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = event.flier_url!;
                              link.download = `${event.slug || event.name}-flyer`;
                              link.target = "_blank";
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Flyer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-secondary">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No flyer uploaded for this event</p>
                    </div>
                  )}
                  
                  {/* Video Section */}
                  {event.flier_video_url && (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <h3 className="text-sm font-medium text-secondary">Promo Video</h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full sm:w-64 aspect-video rounded-lg overflow-hidden border border-border bg-black">
                          <video
                            src={event.flier_video_url}
                            className="w-full h-full object-cover"
                            controls
                            poster={event.flier_url || undefined}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => window.open(event.flier_video_url!, "_blank")}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Open Video
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = event.flier_video_url!;
                              link.download = `${event.slug || event.name}-video`;
                              link.target = "_blank";
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Video
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!event.flier_url && !event.flier_video_url && (
                    <div className="text-center py-8 text-secondary">
                      <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No media uploaded for this event</p>
                      {effectivePermissions.canEdit && (
                        <p className="text-sm mt-2">Upload media in the Settings tab</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          )}

          {/* Photos Tab */}
          {config.canViewPhotos && (
            <TabsContent value="photos" className="space-y-4">
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-primary">Photo Album</h2>
                    <div className="flex items-center gap-2">
                      {/* Publish Button */}
                      {(config.role === "organizer" || config.role === "admin" || config.role === "venue") && album && album.status !== "published" && photos.length > 0 && (
                        <Button 
                          variant="primary" 
                          onClick={() => setShowPublishConfirm(true)}
                          loading={publishingPhotos}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Publish Album
                        </Button>
                      )}
                      {/* Unpublish Button */}
                      {(config.role === "organizer" || config.role === "admin" || config.role === "venue") && album && album.status === "published" && (
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowUnpublishConfirm(true)}
                          loading={unpublishingPhotos}
                          className="text-accent-error hover:bg-accent-error/10"
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {(config.role === "organizer" || config.role === "admin" || config.role === "venue") && (
                    <div className="space-y-4">
                      <PhotoUploader 
                        eventId={eventId} 
                        onUploadComplete={() => {
                          loadPhotos();
                          // If we unpublished for upload, remind to republish
                          if (showRepublishPrompt) {
                            // The prompt will be shown via the state
                          }
                        }}
                        albumStatus={album?.status as "draft" | "published" | undefined}
                        onNeedUnpublish={handleNeedUnpublishForUpload}
                      />
                      
                      {/* Republish prompt after adding photos to unpublished album */}
                      {showRepublishPrompt && album?.status === "draft" && (
                        <div className="p-3 bg-accent-secondary/10 border border-accent-secondary rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-accent-secondary" />
                            <span className="text-sm">Photos added! Ready to publish?</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowRepublishPrompt(false)}
                            >
                              Later
                            </Button>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              onClick={() => {
                                setShowRepublishPrompt(false);
                                handlePublishPhotos();
                              }}
                            >
                              Publish Now
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {album && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={album.status === "published" ? "success" : "secondary"}>
                              {album.status === "published" ? "Published" : "Draft"}
                            </Badge>
                            {album.published_at && (
                              <span className="text-sm text-secondary">
                                Published {new Date(album.published_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {(album as any).photo_last_notified_at && (
                            <span className="text-xs text-secondary flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Last notified: {new Date((album as any).photo_last_notified_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete All Button - Only show for unpublished albums */}
                  {photos.length > 0 && 
                   (config.role === "organizer" || config.role === "admin" || config.role === "venue") &&
                   album && 
                   album.status !== "published" && (
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setShowDeleteAllConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Photos
                      </Button>
                    </div>
                  )}

                  {photos.length > 0 ? (
                    <PhotoGrid
                      photos={photos}
                      eventId={eventId}
                      canManage={config.role === "organizer" || config.role === "admin" || config.role === "venue"}
                      onPhotosChange={loadPhotos}
                      onDelete={(photoId: string) => setShowDeletePhotoConfirm(photoId)}
                    />
                  ) : (
                    <div className="text-center py-8 text-secondary">
                      {(config.role === "organizer" || config.role === "admin" || config.role === "venue")
                        ? "No photos yet. Upload photos to create your event album."
                        : "No photos available yet."}
                    </div>
                  )}

                  {event.slug && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-secondary mb-2">Public Photo Gallery:</p>
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

          {/* Email Stats Tab */}
          {(config.role === "organizer" || config.role === "venue" || config.role === "admin") && (
            <TabsContent value="email-stats" className="space-y-4">
              <EmailStats eventId={eventId} />
            </TabsContent>
          )}

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4">
              <Card className="bg-void/60 backdrop-blur-sm border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-primary flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-warning" />
                    Promoter Leaderboard
                  </h2>
                </div>
                
                {loadingLeaderboard ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-secondary">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No promoters assigned to this event yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 text-sm font-medium text-secondary">Rank</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-secondary">Promoter</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-secondary">Referrals</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-secondary">Check-ins</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-secondary">Conversion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((entry: any, index: number) => {
                          const isCurrentPromoter = promoterId === entry.promoter_id;
                          return (
                            <tr 
                              key={entry.promoter_id} 
                              className={`border-b border-border/50 ${isCurrentPromoter ? "bg-accent-secondary/10" : ""}`}
                            >
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  {entry.rank === 1 && <span className="text-xl">🥇</span>}
                                  {entry.rank === 2 && <span className="text-xl">🥈</span>}
                                  {entry.rank === 3 && <span className="text-xl">🥉</span>}
                                  {entry.rank > 3 && <span className="text-secondary font-medium">#{entry.rank}</span>}
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-sm font-medium text-primary">
                                    {entry.name?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isCurrentPromoter ? "text-primary" : "text-primary"}`}>
                                      {entry.name}
                                      {isCurrentPromoter && <span className="ml-2 text-xs text-primary">(You)</span>}
                                    </p>
                                    <p className="text-xs text-secondary">{entry.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="font-semibold text-primary">{entry.referrals}</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="font-semibold text-success">{entry.checkins}</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant={entry.conversion_rate >= 50 ? "success" : entry.conversion_rate >= 25 ? "warning" : "secondary"}>
                                  {entry.conversion_rate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
          </TabsContent>

          {(effectivePermissions.canEdit || config.role === "organizer" || config.role === "venue" || config.role === "admin") && (
            <TabsContent value="lineup" className="space-y-4">
              <EventLineupManagement eventId={eventId} />
            </TabsContent>
          )}
          {effectivePermissions.canViewSettings && (
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <h2 className="text-xl font-semibold text-primary mb-4">Event Settings</h2>
                <div className="space-y-4">
                  {event.promoter_access_type && (
                    <div>
                      <div className="text-sm text-secondary mb-2">Promoter Access</div>
                      <Badge variant="default">{event.promoter_access_type}</Badge>
                    </div>
                  )}
                  {/* Quick Actions - available to event owners and those with closeout permissions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {config.role === "organizer" && (
                      <Link href={`/app/organizer/events/${eventId}/invites`}>
                        <Button variant="secondary">
                          <QrCode className="h-4 w-4 mr-2" />
                          Manage Invite Codes
                        </Button>
                      </Link>
                    )}
                    {effectivePermissions.canCloseoutEvent && (
                      <Link href={`/app/organizer/events/${eventId}/closeout`}>
                        <Button variant="secondary">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Closeout & Payouts
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>

              {/* Music Tags */}
              {effectivePermissions.canEdit && (
                <Card>
                  <h2 className="text-xl font-semibold text-primary mb-4">Music Genres</h2>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {VENUE_EVENT_GENRES.map((genre) => {
                        const isSelected = eventTags.some((t) => t.tag_type === "music" && t.tag_value === genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => handleTagToggle(genre)}
                            disabled={savingTags}
                            className={`px-3 py-1 text-sm border-2 transition-colors ${
                              isSelected
                                ? "bg-accent-secondary text-white border-accent-secondary"
                                : "bg-glass text-primary border-border hover:border-accent-secondary/50"
                            } ${savingTags ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-secondary">
                      Select the music genres for this event
                    </p>
                  </div>
                </Card>
              )}

              {/* Ownership Transfer - visible to event owners, superadmins, or admin role pages */}
              {(effectivePermissions.isOwner || effectivePermissions.isSuperadmin || config.role === "admin") && (
                <Card>
                  <h2 className="text-xl font-semibold text-primary mb-4">Event Ownership</h2>
                  <div className="space-y-4">
                    {event.owner_user_id ? (
                      // Event has an owner
                      <>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-accent-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-secondary">Current Owner</p>
                            <p className="font-medium text-primary">
                              {effectivePermissions.isOwner ? "You" : "Another user"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-secondary">
                          The event owner has full control over all settings, including the ability to transfer ownership to another user.
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => setShowTransferModal(true)}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Transfer Ownership
                        </Button>
                      </>
                    ) : (
                      // Legacy event - no owner assigned
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                          <AlertCircle className="h-5 w-5 text-warning" />
                          <div>
                            <p className="font-medium text-primary">No Owner Assigned</p>
                            <p className="text-sm text-secondary">
                              This is a legacy event without an owner. Assign an owner to enable ownership features.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          onClick={() => setShowTransferModal(true)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Owner
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      ) : (
        // No tabs - show simple layout (for promoter or minimal views)
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Event Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-primary">Date & Time</p>
                  <p className="text-sm text-secondary">{formatDate(event.start_time)}</p>
                  {event.end_time && (
                    <p className="text-sm text-secondary">Until {formatDate(event.end_time)}</p>
                  )}
                </div>
              </div>
              {event.venue && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Venue</p>
                    <p className="text-sm text-secondary">{event.venue.name}</p>
                    {event.venue.address && (
                      <p className="text-sm text-secondary">{event.venue.address}</p>
                    )}
                  </div>
                </div>
              )}
              {event.capacity && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Capacity</p>
                    <p className="text-sm text-secondary">{event.capacity} attendees</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Description</h3>
            <p className="text-secondary whitespace-pre-wrap">
              {event.description || "No description provided."}
            </p>
          </Card>
        </div>
      )}

      {/* Unpublish for Upload Confirmation Modal */}
      <Modal
        isOpen={showUnpublishForUploadModal}
        onClose={handleCancelUnpublishForUpload}
        title="Album is Published"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary">
            This photo album is currently published. To add new photos, you&apos;ll need to unpublish it first.
          </p>
          <p className="text-secondary text-sm">
            After adding your photos, you can republish the album.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleCancelUnpublishForUpload}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirmUnpublishForUpload}
              loading={unpublishingPhotos}
            >
              Unpublish & Add Photos
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Photos Confirmation Modal */}
      <ConfirmModal
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={handlePublishPhotos}
        title="Publish Photo Album"
        message={
          <span>
            Make these photos visible to attendees?
            <br /><br />
            <strong className="text-accent-success">✉️ Email notifications will be sent to all registered attendees.</strong>
          </span>
        }
        confirmText="Publish & Notify"
        loading={publishingPhotos}
      />

      {/* Unpublish Photos Confirmation Modal */}
      <ConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={handleUnpublishPhotos}
        title="Unpublish Photo Album"
        message="Hide these photos from public view? The gallery will no longer be accessible to attendees."
        variant="warning"
        confirmText="Unpublish"
        loading={unpublishingPhotos}
      />

      {/* Delete Photo Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeletePhotoConfirm !== null}
        onClose={() => setShowDeletePhotoConfirm(null)}
        onConfirm={() => showDeletePhotoConfirm && handleDeletePhoto(showDeletePhotoConfirm)}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
        loading={deletingPhoto !== null}
      />

      {/* Delete All Photos Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAllPhotos}
        title="Delete All Photos"
        message={`Are you sure you want to delete all ${photos.length} photos? This action cannot be undone and will permanently remove all photos from this album.`}
        variant="danger"
        confirmText="Delete All"
        loading={deletingAllPhotos}
      />

      {/* Edit Modal */}
      {effectivePermissions.canEdit && (
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
              <p className="text-xs text-secondary mt-1">
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

            {/* Registration Type */}
            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-primary">Registration Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Registration Type</label>
                <select
                  value={editForm.registration_type}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      registration_type: e.target.value as "guestlist" | "display_only" | "external_link",
                    }))
                  }
                  className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
                >
                  <option value="guestlist">Guestlist - Attendees register through CrowdStack</option>
                  <option value="display_only">Display Only - Show event info, no registration</option>
                  <option value="external_link">External Tickets - Link to external ticketing (RA, Eventbrite, etc.)</option>
                </select>
                <p className="mt-1.5 text-xs text-secondary">
                  {editForm.registration_type === "guestlist" && "Attendees can register directly through CrowdStack with QR check-in."}
                  {editForm.registration_type === "display_only" && "Event will be visible but no registration button will be shown."}
                  {editForm.registration_type === "external_link" && "A \"Get Tickets\" button will link to your external ticketing page."}
                </p>
              </div>

              {editForm.registration_type === "external_link" && (
                <Input
                  label="External Ticket URL"
                  type="url"
                  required
                  value={editForm.external_ticket_url}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, external_ticket_url: e.target.value }))}
                  placeholder="https://ra.co/events/..."
                  helperText="Full URL to your external ticketing page"
                />
              )}
            </div>
            
            {config.role === "venue" && (
              <Textarea
                label="Reason for Changes (Optional)"
                value={editForm.reason}
                onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={2}
                placeholder="Explain why you're making these changes..."
              />
            )}

            {/* Photo Email Notice Setting */}
            <div className="space-y-2 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show_photo_email_notice"
                  checked={editForm.show_photo_email_notice}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, show_photo_email_notice: e.target.checked }))}
                  className="rounded border-border"
                />
                <label htmlFor="show_photo_email_notice" className="text-sm text-primary">
                  Show photo email notice on registration success
                </label>
              </div>
              <p className="text-xs text-secondary ml-6">
                If enabled, attendees will see a message on the registration success page that event photos will be sent to their email in a few days.
              </p>
            </div>

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
                  <label className="text-sm font-medium text-primary">
                    Video Flier (Optional)
                  </label>
                  <Badge variant="secondary" className="text-xs">Premium</Badge>
                </div>
                <p className="text-xs text-secondary">
                  Upload a video flier (9:16 format, max 30 seconds, 50MB). Shown instead of static image on mobile.
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
                      <div className="flex-1 px-4 py-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-primary font-medium">Uploading video...</span>
                          <span className="text-sm text-primary font-mono">{videoUploadProgress}%</span>
                        </div>
                        <div className="w-full bg-accent-secondary/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-accent-secondary h-2 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${videoUploadProgress}%` }}
                          />
                        </div>
                        {videoUploadProgress === 100 && (
                          <p className="text-xs text-primary/70 mt-2">Processing video...</p>
                        )}
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
                            
                            // Log file details for debugging
                            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                            console.log(`[VideoFlier Client] Selected file: ${file.name}, size: ${fileSizeMB}MB, type: ${file.type}`);
                            
                            // Validate size client-side (50MB max - Supabase Storage limit)
                            const maxSizeBytes = 50 * 1024 * 1024; // 50MB
                            
                            if (file.size > maxSizeBytes) {
                              alert(`Video file (${fileSizeMB}MB) must be under 50MB. Please compress your video or use a smaller file.`);
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
                            
                            // Upload directly to Supabase Storage to bypass Vercel's 4.5MB limit
                            setUploadingVideo(true);
                            setVideoUploadProgress(0);
                            setVideoUploadSuccess(false);
                            
                            try {
                              // Generate storage path
                              const fileExt = file.name.split(".").pop() || "mp4";
                              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                              const storagePath = `events/${eventId}/video-flier/${fileName}`;
                              
                              // Upload directly to Supabase Storage
                              const supabase = createBrowserClient();
                              const { data: uploadData, error: uploadError } = await supabase.storage
                                .from("event-photos")
                                .upload(storagePath, file, {
                                  contentType: file.type,
                                  upsert: true,
                                  // Note: Supabase JS client doesn't support progress callbacks directly
                                  // We'll show indeterminate progress
                                });
                              
                              if (uploadError) {
                                const actualFileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                                console.error(`[VideoFlier Client] Supabase upload failed:`, {
                                  message: uploadError.message,
                                  statusCode: (uploadError as any).statusCode,
                                  error: uploadError,
                                  fileSize: `${actualFileSizeMB}MB`,
                                  fileName: file.name
                                });
                                
                                let errorMessage = "Failed to upload video";
                                const errMsg = uploadError.message?.toLowerCase() || "";
                                
                                // Check for file size limit errors
                                if (errMsg.includes("exceeded the maximum allowed size") || 
                                    errMsg.includes("maximum allowed size") ||
                                    errMsg.includes("payload too large") ||
                                    errMsg.includes("file size")) {
                                  errorMessage = `File size (${actualFileSizeMB}MB) exceeds storage limit (50MB). Please compress your video or use a smaller file.`;
                                } 
                                // Check for permission/RLS errors
                                else if (errMsg.includes("permission") || 
                                         errMsg.includes("policy") || 
                                         errMsg.includes("unauthorized") ||
                                         errMsg.includes("not allowed") ||
                                         (uploadError as any).statusCode === 403) {
                                  errorMessage = `Permission denied: You may not have permission to upload videos for this event. Please contact support if this issue persists. (Error: ${uploadError.message})`;
                                } else {
                                  errorMessage = `Upload failed: ${uploadError.message}. File size: ${actualFileSizeMB}MB`;
                                }
                                
                                alert(errorMessage);
                                setUploadingVideo(false);
                                setVideoUploadProgress(0);
                                return;
                              }
                              
                              // Get public URL
                              const { data: urlData } = supabase.storage
                                .from("event-photos")
                                .getPublicUrl(uploadData.path);
                              
                              const publicUrl = urlData.publicUrl;
                              console.log(`[VideoFlier Client] Upload successful: ${publicUrl}`);
                              
                              // Update event record via API (lightweight request, just the URL)
                              const updateResponse = await fetch(`/api/organizer/events/${eventId}/video-flier`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ flier_video_url: publicUrl }),
                              });
                              
                              if (!updateResponse.ok) {
                                const errorData = await updateResponse.json().catch(() => ({}));
                                throw new Error(errorData.error || "Failed to update event");
                              }
                              
                              await loadEventData(false);
                              setVideoUploadSuccess(true);
                              setTimeout(() => setVideoUploadSuccess(false), 3000);
                            } catch (error: any) {
                              console.error(`[VideoFlier Client] Upload error:`, error);
                              alert(error.message || "Failed to upload video. Please try again.");
                            } finally {
                              setUploadingVideo(false);
                              setVideoUploadProgress(0);
                            }
                            
                            // Reset input
                            e.target.value = "";
                          }}
                        />
                        <label
                          htmlFor="video-flier-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:border-accent-secondary/50 hover:bg-accent-secondary/5 transition-colors"
                        >
                          <Upload className="h-4 w-4 text-secondary" />
                          <span className="text-sm text-secondary">Upload Video (MP4, WebM, MOV)</span>
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
              <div className="text-center py-8 text-secondary">
                No edit history available
              </div>
            ) : (
              <div className="space-y-4">
                {editHistory.map((record) => (
                  <Card key={record.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-primary">{record.editor_email}</p>
                        <p className="text-xs text-secondary">{record.editor_role}</p>
                      </div>
                      <div className="text-xs text-secondary">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    {record.reason && (
                      <p className="text-sm text-secondary mb-2">Reason: {record.reason}</p>
                    )}
                    <div className="space-y-1">
                      {Object.entries(record.changes).map(([key, change]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span>{" "}
                          <span className="text-secondary line-through">{String(change.old)}</span>{" "}
                          → <span className="text-primary">{String(change.new)}</span>
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
      {effectivePermissions.canManageDoorStaff && event && (
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
      {effectivePermissions.canManagePromoters && event && (
        <PromoterManagementModal
          isOpen={showPromoterModal}
          onClose={() => setShowPromoterModal(false)}
          eventId={event.id}
          context={config.role === "venue" ? "venue" : "organizer"}
          onUpdate={loadEventData}
        />
      )}

      {/* Ownership Transfer Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferEmail("");
          setFoundUser(null);
        }}
        title={event.owner_user_id ? "Transfer Event Ownership" : "Assign Event Owner"}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary text-sm">
            {event.owner_user_id 
              ? "Transfer ownership of this event to another user. The new owner will have full control over all event settings."
              : "Assign an owner to this event. The owner will have full control over all event settings."
            }
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary">
              New Owner Email
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={transferEmail}
                onChange={(e) => {
                  setTransferEmail(e.target.value);
                  setFoundUser(null);
                }}
                placeholder="Enter user email"
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!transferEmail) return;
                  setSearchingUser(true);
                  try {
                    // Use q= param and type=user to search by email
                    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(transferEmail)}&type=user`);
                    const data = await res.json();
                    if (data.results && data.results.length > 0) {
                      // Find exact email match first, or use first result
                      const exactMatch = data.results.find((r: any) => r.email?.toLowerCase() === transferEmail.toLowerCase());
                      const user = exactMatch || data.results[0];
                      setFoundUser({ id: user.id, email: user.email });
                    } else {
                      toast.error("User not found", "No user found with that email address.");
                      setFoundUser(null);
                    }
                  } catch (error) {
                    toast.error("Search failed", "Could not search for user.");
                  } finally {
                    setSearchingUser(false);
                  }
                }}
                loading={searchingUser}
                disabled={!transferEmail}
              >
                Search
              </Button>
            </div>
          </div>

          {foundUser && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm text-primary">
                  Found user: <strong>{foundUser.email}</strong>
                </span>
              </div>
            </div>
          )}

          {event.owner_user_id && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Warning</p>
                <p className="text-xs text-secondary">
                  Once transferred, you will lose owner-level access to this event unless you are a team member or superadmin.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowTransferModal(false);
                setTransferEmail("");
                setFoundUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!foundUser) return;
                setTransferring(true);
                try {
                  const res = await fetch(`/api/events/${eventId}/transfer-ownership`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ new_owner_user_id: foundUser.id }),
                  });
                  if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to transfer ownership");
                  }
                  toast.success("Ownership transferred", "Event ownership has been successfully transferred.");
                  setShowTransferModal(false);
                  setTransferEmail("");
                  setFoundUser(null);
                  // Reload event data and permissions
                  loadEventData();
                } catch (error: any) {
                  toast.error("Transfer failed", error.message);
                } finally {
                  setTransferring(false);
                }
              }}
              loading={transferring}
              disabled={!foundUser}
            >
              {event.owner_user_id ? "Transfer Ownership" : "Assign Owner"}
            </Button>
          </div>
        </div>
      </Modal>

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
                  <p className="font-medium text-primary">Approve this event?</p>
                  <p className="text-sm text-secondary mt-1">
                    Both the venue admins and the event organizer will be notified of this approval.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20">
                  <AlertCircle className="h-5 w-5 text-danger mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Reject this event?</p>
                    <p className="text-sm text-secondary mt-1">
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

      {/* Promoter QR Code Modal */}
      {showQRModal && config.role === "promoter" && event && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Surface variant="void" className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-primary">
                Your Referral QR Code
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-secondary hover:text-primary"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-secondary">
              {event.name}
            </p>

            <div className="flex flex-col items-center py-4">
              {getReferralLink() ? (
                <div className="bg-white p-4 rounded-lg">
                  <BeautifiedQRCode
                    url={getReferralLink()!}
                    size={256}
                    logoSize={50}
                  />
                </div>
              ) : (
                <div className="text-secondary">Loading QR code...</div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-secondary text-center">
                Anyone who scans this QR code and registers will be attributed to you
              </p>
              
              <Surface variant="glass" className="flex items-center gap-2 p-3">
                <input
                  type="text"
                  value={getReferralLink() || "Loading..."}
                  readOnly
                  className="flex-1 bg-transparent text-primary text-xs font-mono truncate"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyReferralLink}
                  className="shrink-0"
                >
                  {copiedReferral ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </Surface>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={async () => {
                    const link = getReferralLink();
                    if (!link) return;
                    
                    try {
                      // Generate QR code with logo for download
                      const QRCode = (await import("qrcode")).default;
                      const canvas = document.createElement("canvas");
                      const size = 512; // Higher resolution for download
                      const logoSize = 100;
                      
                      await QRCode.toCanvas(canvas, link, {
                        width: size,
                        margin: 2,
                        color: {
                          dark: "#000000",
                          light: "#FFFFFF",
                        },
                        errorCorrectionLevel: "H",
                      });
                      
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        // Load and draw logo
                        const logo = new Image();
                        logo.crossOrigin = "anonymous";
                        
                        await new Promise((resolve, reject) => {
                          logo.onload = () => {
                            const centerX = size / 2;
                            const centerY = size / 2;
                            const logoX = centerX - logoSize / 2;
                            const logoY = centerY - logoSize / 2;
                            
                            // White background circle
                            ctx.fillStyle = "#FFFFFF";
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, logoSize / 2 + 8, 0, 2 * Math.PI);
                            ctx.fill();
                            
                            // Draw logo
                            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
                            resolve(null);
                          };
                          logo.onerror = reject;
                          logo.src = "/logos/crowdstack-icon-tricolor-on-transparent.png";
                        });
                      }
                      
                      // Download
                      canvas.toBlob((blob) => {
                        if (blob) {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `${event.slug}-referral-qr.png`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }
                      });
                    } catch (error) {
                      console.error("Error downloading QR code:", error);
                    }
                  }}
                >
                  Download QR
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowQRModal(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </Surface>
        </div>
      )}
      </div>
    </div>
  );
}


