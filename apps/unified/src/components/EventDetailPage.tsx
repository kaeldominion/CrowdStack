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
  VipBadge,
} from "@crowdstack/ui";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { VenueFeedbackPanel } from "@/components/feedback/VenueFeedbackPanel";

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
  Crown,
  Sparkles,
  RefreshCw,
  Layers,
  MessageSquare,
} from "lucide-react";
import { getCurrencySymbol } from "@/lib/constants/currencies";
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
import { TIMEZONE_GROUPS } from "@/lib/constants/timezones";
import { EventStatusStepper, type EventStatus } from "@/components/EventStatusStepper";
import { BookingsTab } from "@/components/BookingsTab";
import { AttendeesTab } from "@/components/event-detail/AttendeesTab";

export type EventDetailRole = "organizer" | "venue" | "promoter" | "admin";

interface EventDetailConfig {
  role: EventDetailRole;
  eventApiEndpoint: string;
  statsApiEndpoint?: string;
  attendeesApiEndpoint?: string;
  approveApiEndpoint?: string;
  tablesApiEndpoint?: string;
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
  canViewTables?: boolean;
  canViewBookings?: boolean;
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
  important_info: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  max_guestlist_size: number | null;
  flier_url: string | null;
  flier_video_url: string | null;
  timezone: string | null;
  mobile_style: "flip" | "scroll" | null;
  promoter_access_type?: string;
  organizer_id: string;
  venue_id: string | null;
  owner_user_id: string | null; // The user who owns this event
  owner?: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null;
  venue_approval_status?: string | null;
  venue_approval_at?: string | null;
  venue_rejection_reason?: string | null;
  show_photo_email_notice?: boolean;
  is_featured?: boolean;
  registration_type?: string | null; // Deprecated, kept for backward compatibility
  has_guestlist?: boolean | null;
  ticket_sale_mode?: "none" | "external" | "internal" | null;
  is_public?: boolean | null;
  external_ticket_url?: string | null;
  table_booking_mode?: "disabled" | "promoter_only" | "direct" | null;
  checkin_cutoff_enabled?: boolean;
  checkin_cutoff_time_male?: string | null; // "HH:MM:SS" format
  checkin_cutoff_time_female?: string | null; // "HH:MM:SS" format
  created_at: string;
  // Closeout fields
  closed_at?: string | null;
  closed_by?: string | null;
  locked_at?: string | null;
  closeout_notes?: string | null;
  total_revenue?: number | null;
  organizer?: { id: string; name: string; email: string | null };
  venue?: { id: string; name: string; slug?: string | null; address: string | null; city: string | null; capacity?: number | null };
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
  id: string; // Registration ID
  attendee_id: string; // Actual attendee ID
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
  is_organizer_vip?: boolean;
  is_global_vip?: boolean;
  is_event_vip?: boolean;
  event_vip_reason?: string | null;
  notes?: string | null;
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
  photo_last_notified_at?: string | null;
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
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [togglingVip, setTogglingVip] = useState<string | null>(null);
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
  const [organizers, setOrganizers] = useState<any[]>([]);
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Event tables state (for venue table availability)
  interface EventTableData {
    id: string;
    name: string;
    capacity: number;
    minimum_spend: number | null;
    deposit_amount: number | null;
    notes: string | null;
    zone: { id: string; name: string; display_order: number };
    availability: {
      is_available: boolean;
      override_minimum_spend: number | null;
      override_deposit: number | null;
      notes: string | null;
    } | null;
    effective_minimum_spend: number | null;
    effective_deposit: number | null;
  }
  interface ZoneWithTables {
    zone: { id: string; name: string; display_order: number };
    tables: EventTableData[];
  }
  const [eventTablesData, setEventTablesData] = useState<ZoneWithTables[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [savingTables, setSavingTables] = useState(false);
  const [tableChanges, setTableChanges] = useState<Map<string, {
    is_available: boolean;
    override_minimum_spend: number | null;
    override_deposit: number | null;
    notes: string | null;
  }>>(new Map());
  const [tablesCurrency, setTablesCurrency] = useState<string>("USD");
  const [bookingMode, setBookingMode] = useState<"disabled" | "promoter_only" | "direct">("disabled");
  const [savingBookingMode, setSavingBookingMode] = useState(false);

  // Check-in cutoff state
  const [checkinCutoffEnabled, setCheckinCutoffEnabled] = useState(false);
  const [checkinCutoffTimeMale, setCheckinCutoffTimeMale] = useState("");
  const [checkinCutoffTimeFemale, setCheckinCutoffTimeFemale] = useState("");
  const [savingCutoff, setSavingCutoff] = useState(false);

  // Load current user ID for referral attribution
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error("[EventDetailPage] Error loading current user:", error);
      }
    };
    loadCurrentUser();
  }, []);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    description: "",
    important_info: "",
    start_time: "",
    end_time: "",
    max_guestlist_size: "",
    status: "",
    organizer_id: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    mobile_style: "flip" as "flip" | "scroll",
    reason: "",
    show_photo_email_notice: false,
    has_guestlist: true,
    ticket_sale_mode: "none" as "none" | "external" | "internal",
    is_public: true,
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

  // Load event tables when tab is selected
  useEffect(() => {
    if (activeTab === "tables" && event && config.canViewTables && config.tablesApiEndpoint && eventTablesData.length === 0 && !loadingTables) {
      const loadEventTables = async () => {
        setLoadingTables(true);
        try {
          const response = await fetch(config.tablesApiEndpoint!.replace("[eventId]", event.id));
          if (response.ok) {
            const data = await response.json();
            setEventTablesData(data.groupedByZone || []);
            if (data.currency) {
              setTablesCurrency(data.currency);
            }
          }
        } catch (error) {
          console.error("Failed to load event tables:", error);
        } finally {
          setLoadingTables(false);
        }
      };
      loadEventTables();
    }
  }, [activeTab, event, config.canViewTables, config.tablesApiEndpoint, eventTablesData.length, loadingTables]);

  // Generate referral link for any user
  // Get referral code based on role - ALWAYS include for tracking
  const getReferralCode = () => {
    // Promoters use their promoter ID for commission tracking
    if (config.role === "promoter" && promoterId) {
      return promoterId;
    }
    // All other roles use their user ID for tracking
    // This ensures all shares are attributed to the person sharing
    if (currentUserId) {
      return `user_${currentUserId}`;
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
    // Link to event public page (not directly to registration)
    // The ref param will be preserved when users click Register on the event page
    return `${webUrl}/e/${event.slug}?ref=${refCode}`;
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

        // Status stays as published/draft - "ended" is determined by date, not status
        setEvent(data.event);
        // Set booking mode from event data
        if (data.event.table_booking_mode) {
          setBookingMode(data.event.table_booking_mode);
        }
        // Set check-in cutoff settings from event data
        setCheckinCutoffEnabled(data.event.checkin_cutoff_enabled ?? false);
        setCheckinCutoffTimeMale(data.event.checkin_cutoff_time_male?.slice(0, 5) ?? ""); // "HH:MM:SS" -> "HH:MM"
        setCheckinCutoffTimeFemale(data.event.checkin_cutoff_time_female?.slice(0, 5) ?? ""); // "HH:MM:SS" -> "HH:MM"
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
            important_info: data.event.important_info || "",
            start_time: data.event.start_time?.slice(0, 16) || "",
            end_time: data.event.end_time?.slice(0, 16) || "",
            max_guestlist_size: data.event.max_guestlist_size?.toString() || "",
            status: data.event.status || "",
            organizer_id: data.event.organizer_id || "",
            timezone: data.event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
            mobile_style: data.event.mobile_style || "flip",
            reason: "",
            show_photo_email_notice: Boolean(data.event.show_photo_email_notice),
            has_guestlist: data.event.has_guestlist ?? (data.event.registration_type === "guestlist" || !data.event.registration_type ? true : false),
            ticket_sale_mode: (data.event.ticket_sale_mode as "none" | "external" | "internal") || 
              (data.event.registration_type === "external_link" ? "external" : "none"),
            is_public: data.event.is_public ?? (data.event.registration_type === "display_only" ? false : true),
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
      return;
    }
    try {
      const response = await fetch(config.statsApiEndpoint);
      if (response.ok) {
        const data = await response.json();
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
        if (data.userContext?.organizerId) {
          setOrganizerId(data.userContext.organizerId);
        }
      }
    } catch (error) {
      console.error("Failed to load attendees:", error);
    }
  };

  const handleCheckIn = async (registrationId: string) => {
    if (!eventId) return;
    
    setCheckingIn(registrationId);
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to check in attendee";
        toast.error(errorMessage);
        return;
      }

      if (data.success) {
        toast.success(data.message || "Attendee checked in successfully");
        // Reload attendees to update the UI
        loadAttendees();
        // Reload stats
        loadStats();
      } else {
        toast.error(data.error || "Failed to check in attendee");
      }
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error(error.message || "Failed to check in attendee");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCheckOut = async (registrationId: string) => {
    if (!eventId) return;

    setCheckingOut(registrationId);
    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || "Failed to check out attendee";
        toast.error(errorMessage);
        return;
      }

      if (data.success) {
        toast.success(data.message || "Attendee checked out successfully");
        // Reload attendees to update the UI
        loadAttendees();
        // Reload stats
        loadStats();
      } else {
        toast.error(data.error || "Failed to check out attendee");
      }
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast.error(error.message || "Failed to check out attendee");
    } finally {
      setCheckingOut(null);
    }
  };

  // Toggle event VIP status for a registration (works for venue, organizer, promoter, admin)
  const handleToggleEventVip = async (registrationId: string, isCurrentlyVip?: boolean) => {
    setTogglingVip(registrationId);
    try {
      const response = await fetch(`/api/events/${eventId}/registrations/${registrationId}/vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update VIP status");
        return;
      }

      toast.success(data.message || "VIP status updated");
      // Reload attendees to update the UI
      loadAttendees();
    } catch (error: any) {
      console.error("Toggle VIP error:", error);
      toast.error(error.message || "Failed to update VIP status");
    } finally {
      setTogglingVip(null);
    }
  };

  const toggleOrganizerVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    // Use organizerId from state, or fallback to event's organizer_id
    const currentOrganizerId = organizerId || event?.organizer_id;

    if (!currentOrganizerId) {
      toast.error("Organizer ID not found");
      return;
    }

    setTogglingVip(attendeeId);
    try {
      let response: Response;
      if (isCurrentlyVip) {
        // Remove VIP
        response = await fetch(
          `/api/organizer/attendees/${attendeeId}/vip?organizerId=${currentOrganizerId}`,
          { method: "DELETE" }
        );
      } else {
        // Add VIP
        response = await fetch(`/api/organizer/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizerId: currentOrganizerId }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to ${isCurrentlyVip ? "remove" : "add"} VIP status`;
        console.error("VIP toggle error:", errorMessage, response.status, errorData);
        throw new Error(errorMessage);
      }

      // Reload attendees
      await loadAttendees();
      toast.success(isCurrentlyVip ? "VIP status removed" : "Attendee marked as VIP");
    } catch (error) {
      console.error("Error toggling VIP:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update VIP status";
      toast.error(errorMessage);
    } finally {
      setTogglingVip(null);
    }
  };

  const toggleVenueVip = async (attendeeId: string, isCurrentlyVip: boolean) => {
    const currentVenueId = event?.venue_id;

    if (!currentVenueId) {
      toast.error("Venue ID not found");
      return;
    }

    setTogglingVip(attendeeId);
    try {
      let response: Response;
      if (isCurrentlyVip) {
        // Remove VIP
        response = await fetch(
          `/api/venue/attendees/${attendeeId}/vip?venueId=${currentVenueId}`,
          { method: "DELETE" }
        );
      } else {
        // Add VIP
        response = await fetch(`/api/venue/attendees/${attendeeId}/vip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ venueId: currentVenueId }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to ${isCurrentlyVip ? "remove" : "add"} venue VIP status`;
        console.error("Venue VIP toggle error:", errorMessage, response.status, errorData);
        throw new Error(errorMessage);
      }

      // Reload attendees
      await loadAttendees();
      toast.success(isCurrentlyVip ? "Venue VIP status removed" : "Attendee marked as Venue VIP");
    } catch (error) {
      console.error("Error toggling Venue VIP:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update Venue VIP status";
      toast.error(errorMessage);
    } finally {
      setTogglingVip(null);
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

      if (editForm.name !== event.name) updates.name = editForm.name;
      if (editForm.slug !== event.slug) updates.slug = editForm.slug;
      if (editForm.description !== (event.description || "")) updates.description = editForm.description || null;
      if (editForm.important_info !== (event.important_info || "")) updates.important_info = editForm.important_info || null;
      if (editForm.start_time !== event.start_time?.slice(0, 16)) {
        updates.start_time = new Date(editForm.start_time).toISOString();
      }
      if (editForm.end_time !== (event.end_time?.slice(0, 16) || "")) {
        updates.end_time = editForm.end_time ? new Date(editForm.end_time).toISOString() : null;
      }
      
      if (editForm.max_guestlist_size !== (event.max_guestlist_size?.toString() || "")) updates.max_guestlist_size = editForm.max_guestlist_size ? parseInt(editForm.max_guestlist_size) : null;
      if (editForm.status !== event.status) updates.status = editForm.status;
      if (editForm.organizer_id !== event.organizer_id) updates.organizer_id = editForm.organizer_id;
      if (editForm.timezone !== (event.timezone || "")) updates.timezone = editForm.timezone || "America/New_York";
      if (editForm.mobile_style !== (event.mobile_style || "flip")) updates.mobile_style = editForm.mobile_style;
      
      // Handle show_photo_email_notice - compare boolean values properly
      const currentPhotoNotice = Boolean(event.show_photo_email_notice);
      if (editForm.show_photo_email_notice !== currentPhotoNotice) {
        updates.show_photo_email_notice = editForm.show_photo_email_notice;
      }

      // Feature flags and external ticket URL
      const eventHasGuestlist = (event as EventData).has_guestlist ?? true;
      const eventTicketSaleMode = (event as EventData).ticket_sale_mode || "none";
      const eventIsPublic = (event as EventData).is_public ?? true;
      const eventExternalTicketUrl = (event as EventData).external_ticket_url || "";
      
      if (editForm.has_guestlist !== eventHasGuestlist) {
        updates.has_guestlist = editForm.has_guestlist;
      }
      if (editForm.ticket_sale_mode !== eventTicketSaleMode) {
        updates.ticket_sale_mode = editForm.ticket_sale_mode;
      }
      if (editForm.is_public !== eventIsPublic) {
        updates.is_public = editForm.is_public;
      }
      if (editForm.external_ticket_url !== eventExternalTicketUrl) {
        updates.external_ticket_url = editForm.external_ticket_url || null;
      }

      // Validate max_guestlist_size when guestlist is enabled
      if (editForm.has_guestlist && !editForm.max_guestlist_size) {
        toast.error("Max guestlist size is required when guestlist registration is enabled");
        return;
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

      const response = await fetch(endpoint, {
        method: config.role === "venue" ? "PUT" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          config.role === "venue" 
            ? { updates, reason: editForm.reason || undefined }
            : updates
        ),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[EventEdit] Error response:", error);
        throw new Error(error.error || "Failed to save changes");
      }

      const responseData = await response.json();

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

  // Promoter requests feature has been removed
  // const loadPromoterRequests = async () => {
  //   try {
  //     const response = await fetch(`/api/events/${eventId}/promoter-requests`);
  //     if (response.ok) {
  //       const data = await response.json();
  //       setPromoterRequests(data.requests || []);
  //     } else {
  //       const errorData = await response.text();
  //       console.error("Failed to load promoter requests:", response.status, errorData);
  //     }
  //   } catch (error) {
  //     console.error("Error loading promoter requests:", error);
  //   }
  // };


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

  // Use chart data from API, or generate empty array if not available
  const chartData = stats?.chart_data || [];

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
        <h2 className="section-header">Event Not Found</h2>
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
  // Tables tab - show for venues and admins (manages table availability)
  if (config.canViewTables && (config.role === "venue" || config.role === "admin")) {
    tabs.push({ value: "tables", label: "Tables" });
  }
  // Bookings tab - show for venues, organizers, and admins when enabled
  if (config.canViewBookings && (config.role === "venue" || config.role === "organizer" || config.role === "admin")) {
    tabs.push({ value: "bookings", label: "Bookings" });
  }
  // Venue Pulse (Feedback) tab - show for venues only
  if (config.role === "venue") {
    tabs.push({ value: "feedback", label: "Venue Pulse" });
  }

  return (
    <div className="relative min-h-screen">
      <div className="space-y-6">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <h1 className="page-title truncate">
              {event.name}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {/* Owner Badge - show for venue role to distinguish organizer vs venue events */}
              {config.role === "venue" && event.organizer && (
                <Badge color="blue" variant="outline" size="sm" title={`Organized by ${event.organizer.name}`}>
                  <Users className="h-3 w-3 mr-1" />
                  {event.organizer.name}
                </Badge>
              )}
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
          {((config.role === "promoter" && promoterId) || (config.role === "organizer" && currentUserId)) && (
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

      {/* Event Lifecycle Stepper - Show for venue, organizers and admins */}
      {(config.role === "venue" || config.role === "organizer" || config.role === "admin") && (
        <Card className="overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="label-mono">
              Event Lifecycle
            </span>
          </div>
          <EventStatusStepper
            status={(() => {
              // Compute effective status based on end_time and closed_at
              const dbStatus = (event.status || "draft") as EventStatus;

              // If closed_at is set, event has been closed out
              if (event.closed_at) {
                return "closed" as EventStatus;
              }

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
            closedAt={event.closed_at}
            size="md"
            showLabels={true}
          />
        </Card>
      )}

      {/* Venue Approval Status (for organizers) */}
      {config.role === "organizer" && config.showVenueApproval && event.venue_approval_status && (
        <Card className="border-l-4 border-l-warning">
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
            : "grid-cols-2 md:grid-cols-2 lg:grid-cols-4"
        }`}>
          {config.role === "promoter" ? (
            <>
              {/* Your Stats Section */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-mono">My Referrals</p>
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
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-mono">My Check-ins</p>
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
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="label-mono">Leaderboard</p>
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
              <Card>
                <div className="space-y-2">
                  <p className="label-mono">Event Overall</p>
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
                  <div className="label-mono">Registrations</div>
                  <div className="text-3xl font-bold text-primary">
                    {stats.capacity 
                      ? `${stats.total_registrations || 0}/${stats.capacity}`
                      : stats.total_registrations || 0
                    }
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
                  <div className="label-mono">Check-ins</div>
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
              <Card>
                <div className="space-y-2">
                  <div className="label-mono">Pending Check-ins</div>
                  <div className="text-3xl font-bold text-[var(--accent-warning)]">
                    {Math.max(0, (stats.total_registrations || 0) - (stats.total_check_ins || 0))}
                  </div>
                  {stats.total_registrations && stats.total_registrations > 0 && (
                    <div className="text-xs text-secondary">
                      Not yet checked in
                    </div>
                  )}
                </div>
              </Card>
              {event.venue?.capacity && (
                <Card>
                  <div className="space-y-2">
                    <div className="label-mono">Venue Capacity</div>
                    <div className="text-3xl font-bold text-primary">
                      {event.venue.capacity.toLocaleString()}
                    </div>
                    <div className="text-xs text-secondary">
                      Maximum capacity
                    </div>
                  </div>
                </Card>
              )}
              {event.event_promoters && (
                <Card>
                  <div className="space-y-2">
                    <div className="label-mono">Promoters</div>
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
          <TabsList className="flex flex-wrap h-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.value === "media" && <Video className="h-4 w-4 mr-1" />}
                {tab.value === "photos" && <ImageIcon className="h-4 w-4 mr-1" />}
                {tab.value === "email-stats" && <Mail className="h-4 w-4 mr-1" />}
                {tab.value === "leaderboard" && <Trophy className="h-4 w-4 mr-1" />}
                {tab.value === "tables" && <Layers className="h-4 w-4 mr-1" />}
                {tab.value === "feedback" && <MessageSquare className="h-4 w-4 mr-1" />}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Event Details */}
            <Card>
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
                  <h2 className="section-header">Event Details</h2>
                  
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
                              href={`/v/${event.venue.slug}`}
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
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share className="h-5 w-5 text-primary" />
                      <h2 className="section-header !mb-0">Share Event</h2>
                    </div>
                    <a
                      href={`/e/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-accent-secondary text-sm inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </a>
                  </div>

                  {/* Share Link - Always includes referral code for tracking */}
                  {event.slug && (
                    <div className="space-y-3 p-3 bg-accent-secondary/5 rounded-lg border border-accent-secondary/20">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-primary">
                          {config.role === "promoter" ? "Your Referral Link" : "Your Share Link"}
                        </div>
                        {config.role === "promoter" && (
                          <Badge variant="secondary" className="bg-accent-secondary/20 text-primary text-xs">
                            Earn commissions
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-void rounded border border-primary/30 overflow-hidden">
                          <LinkIcon className="h-3 w-3 text-accent-secondary flex-shrink-0" />
                          <code className="text-xs text-primary truncate">
                            {getReferralLink() || `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.slug}`}
                          </code>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            const link = getReferralLink() || `${window.location.origin}/e/${event.slug}`;
                            navigator.clipboard.writeText(link);
                            setCopiedReferral(true);
                            toast.success("Link copied!");
                            setTimeout(() => setCopiedReferral(false), 2000);
                          }}
                        >
                          {copiedReferral ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedReferral ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            const link = getReferralLink() || `${window.location.origin}/e/${event.slug}`;
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

                      {/* Tracking info */}
                      {getReferralCode() && (
                        <div className="pt-2 border-t border-primary/10">
                          <p className="text-xs text-secondary">
                            {config.role === "promoter"
                              ? "Share to earn commissions when referrals attend"
                              : "Registrations from this link are tracked to you"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Activity Chart - For all roles */}
              <Card>
                <h3 className="section-header">
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
              <Card>
                <h3 className="section-header">
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
            <TabsContent value="attendees">
              <AttendeesTab
                eventId={eventId}
                role={config.role}
                attendees={attendees}
                attendeeStats={attendeeStats}
                promoterOptions={promoterOptions}
                inviteCodes={inviteCodes}
                isPromoterView={isPromoterView}
                organizerId={organizerId}
                eventOrganizerId={event.organizer_id}
                venueId={event.venue_id}
                onRefresh={loadAttendees}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onToggleEventVip={handleToggleEventVip}
                onToggleOrganizerVip={toggleOrganizerVip}
                onToggleVenueVip={toggleVenueVip}
                checkingIn={checkingIn}
                checkingOut={checkingOut}
                togglingVip={togglingVip}
              />
            </TabsContent>
          )}

          {config.canViewPromoters && (
            <TabsContent value="promoters" className="space-y-4">

              {/* Assigned Promoters */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-header !mb-0">Assigned Promoters</h2>
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
                        Click &quot;Add Promoter&quot; to assign promoters with payment terms.
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
              <Card>
                <div className="space-y-6">
                  <h2 className="section-header !mb-0">Event Media</h2>
                  
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
                    <h2 className="section-header !mb-0">Photo Album</h2>
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
                          {album.photo_last_notified_at && (
                            <span className="text-xs text-secondary flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Last notified: {new Date(album.photo_last_notified_at).toLocaleString()}
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
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="section-header !mb-0 flex items-center gap-2">
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
                <h2 className="section-header">Event Settings</h2>
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
                  <h2 className="section-header">Music Genres</h2>
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

              {/* Check-in Cutoff Settings */}
              {effectivePermissions.canEdit && (
                <Card>
                  <h2 className="section-header">Check-in Cutoff</h2>
                  <p className="text-sm text-secondary mb-4">
                    Set a time after which door staff will receive a warning before checking in guests. They can still override and allow entry.
                  </p>

                  <div className="space-y-4">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary">Enable Cutoff Time</p>
                        <p className="text-xs text-secondary">Warn door staff for late arrivals</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checkinCutoffEnabled}
                          onClick={async () => {
                            const newEnabled = !checkinCutoffEnabled;
                            setSavingCutoff(true);
                            try {
                              const response = await fetch(config.eventApiEndpoint, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ checkin_cutoff_enabled: newEnabled }),
                              });
                              if (response.ok) {
                                setCheckinCutoffEnabled(newEnabled);
                                toast.success(newEnabled ? "Cutoff time enabled" : "Cutoff time disabled");
                              } else {
                                const errorData = await response.json();
                                toast.error(errorData.error || "Failed to update setting");
                              }
                            } catch (error) {
                              toast.error("Failed to update setting");
                            } finally {
                              setSavingCutoff(false);
                            }
                          }}
                          disabled={savingCutoff}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            checkinCutoffEnabled ? "bg-accent-primary" : "bg-border"
                          } ${savingCutoff ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              checkinCutoffEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        {savingCutoff && <InlineSpinner />}
                      </div>
                    </div>

                    {/* Time Pickers - Only shown when enabled */}
                    {checkinCutoffEnabled && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Male Cutoff Time */}
                          <div>
                            <label className="text-sm font-medium text-primary block mb-2">
                              Male Cutoff
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={checkinCutoffTimeMale}
                                onChange={async (e) => {
                                  const newTime = e.target.value;
                                  setCheckinCutoffTimeMale(newTime);
                                  setSavingCutoff(true);
                                  try {
                                    const response = await fetch(config.eventApiEndpoint, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ checkin_cutoff_time_male: newTime ? `${newTime}:00` : null }),
                                    });
                                    if (response.ok) {
                                      toast.success("Male cutoff time updated");
                                    } else {
                                      const errorData = await response.json();
                                      toast.error(errorData.error || "Failed to update cutoff time");
                                    }
                                  } catch (error) {
                                    toast.error("Failed to update cutoff time");
                                  } finally {
                                    setSavingCutoff(false);
                                  }
                                }}
                                disabled={savingCutoff}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg dark:text-white text-gray-900 dark:[color-scheme:dark]"
                              />
                              {savingCutoff && <InlineSpinner />}
                            </div>
                          </div>

                          {/* Female Cutoff Time */}
                          <div>
                            <label className="text-sm font-medium text-primary block mb-2">
                              Female Cutoff
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={checkinCutoffTimeFemale}
                                onChange={async (e) => {
                                  const newTime = e.target.value;
                                  setCheckinCutoffTimeFemale(newTime);
                                  setSavingCutoff(true);
                                  try {
                                    const response = await fetch(config.eventApiEndpoint, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ checkin_cutoff_time_female: newTime ? `${newTime}:00` : null }),
                                    });
                                    if (response.ok) {
                                      toast.success("Female cutoff time updated");
                                    } else {
                                      const errorData = await response.json();
                                      toast.error(errorData.error || "Failed to update cutoff time");
                                    }
                                  } catch (error) {
                                    toast.error("Failed to update cutoff time");
                                  } finally {
                                    setSavingCutoff(false);
                                  }
                                }}
                                disabled={savingCutoff}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg dark:text-white text-gray-900 dark:[color-scheme:dark]"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-secondary">
                          Times in event timezone ({event?.timezone || "UTC"}). If attendee has no gender set, male cutoff is used as default.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Ownership Transfer - visible to event owners, superadmins, or admin role pages */}
              {(effectivePermissions.isOwner || effectivePermissions.isSuperadmin || config.role === "admin") && (
                <Card>
                  <h2 className="section-header">Event Ownership</h2>
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
                              {effectivePermissions.isOwner ? "You" : (
                                event.owner?.first_name || event.owner?.last_name
                                  ? `${event.owner?.first_name || ""} ${event.owner?.last_name || ""}`.trim()
                                  : event.owner?.email || "Unknown user"
                              )}
                            </p>
                            {!effectivePermissions.isOwner && event.owner?.email && (event.owner?.first_name || event.owner?.last_name) && (
                              <p className="text-xs text-secondary">{event.owner.email}</p>
                            )}
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

          {/* Tables Tab - Venue and Admin */}
          {config.canViewTables && (config.role === "venue" || config.role === "admin") && (
            <TabsContent value="tables" className="space-y-4">
              {/* Booking Mode Selector */}
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-header !mb-0">Table Booking Mode</h3>
                    <p className="text-sm text-secondary mt-1">
                      Control how guests can request table bookings for this event.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={bookingMode}
                      onChange={async (e) => {
                        const newMode = e.target.value as "disabled" | "promoter_only" | "direct";
                        if (!event) return;
                        setSavingBookingMode(true);
                        try {
                          const response = await fetch(config.eventApiEndpoint, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ table_booking_mode: newMode }),
                          });
                          if (response.ok) {
                            setBookingMode(newMode);
                            toast.success("Booking mode updated");
                          } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || "Failed to update booking mode");
                          }
                        } catch (error) {
                          toast.error("Failed to update booking mode");
                        } finally {
                          setSavingBookingMode(false);
                        }
                      }}
                      disabled={savingBookingMode}
                      className="px-3 py-2 bg-surface border border-border rounded-lg text-primary min-w-[200px]"
                    >
                      <option value="disabled">Disabled - Tables hidden</option>
                      <option value="promoter_only">Promoter Only - Via referral links</option>
                      <option value="direct">Direct - Anyone can request</option>
                    </select>
                    {savingBookingMode && <InlineSpinner />}
                  </div>
                </div>
                {bookingMode !== "disabled" && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      {bookingMode === "promoter_only"
                        ? "Tables will only be shown to guests who arrive via a promoter's referral link."
                        : "Tables will be visible to all guests on the event page. Anyone can request a booking."}
                    </p>
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="section-header !mb-0">Table Availability</h2>
                    <p className="text-sm text-secondary mt-1">
                      Configure which tables are available for this event and set per-event pricing overrides.
                    </p>
                  </div>
                  {tableChanges.size > 0 && (
                    <Button
                      variant="primary"
                      disabled={savingTables}
                      onClick={async () => {
                        if (!config.tablesApiEndpoint || !event) return;
                        setSavingTables(true);
                        try {
                          const updates = Array.from(tableChanges.entries()).map(([tableId, changes]) => ({
                            table_id: tableId,
                            ...changes,
                          }));
                          const response = await fetch(
                            config.tablesApiEndpoint.replace("[eventId]", event.id),
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ updates }),
                            }
                          );
                          if (response.ok) {
                            toast.success("Table availability saved");
                            setTableChanges(new Map());
                            // Reload tables data
                            const reloadResponse = await fetch(config.tablesApiEndpoint.replace("[eventId]", event.id));
                            if (reloadResponse.ok) {
                              const data = await reloadResponse.json();
                              setEventTablesData(data.groupedByZone || []);
                              if (data.currency) {
                                setTablesCurrency(data.currency);
                              }
                            }
                          } else {
                            const errorData = await response.json();
                            toast.error(errorData.error || "Failed to save");
                          }
                        } catch (error) {
                          toast.error("Failed to save table availability");
                        } finally {
                          setSavingTables(false);
                        }
                      }}
                    >
                      {savingTables ? <InlineSpinner className="mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Save Changes ({tableChanges.size})
                    </Button>
                  )}
                </div>

                {loadingTables ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : eventTablesData.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-primary mb-2">No Tables Configured</h3>
                    <p className="text-secondary mb-4">
                      Set up your venue's table inventory in the Tables management page.
                    </p>
                    <Link href="/app/venue/tables">
                      <Button variant="secondary">
                        <Layers className="h-4 w-4 mr-2" />
                        Manage Tables
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {eventTablesData.map((zoneGroup) => {
                      const getTableState = (table: EventTableData) => {
                        const changes = tableChanges.get(table.id);
                        if (changes) return changes;
                        return {
                          is_available: table.availability?.is_available ?? true,
                          override_minimum_spend: table.availability?.override_minimum_spend ?? null,
                          override_deposit: table.availability?.override_deposit ?? null,
                          notes: table.availability?.notes ?? null,
                        };
                      };

                      const updateTable = (tableId: string, field: string, value: any) => {
                        const table = eventTablesData.flatMap(z => z.tables).find(t => t.id === tableId);
                        if (!table) return;

                        const currentState = getTableState(table);
                        const newState = { ...currentState, [field]: value };

                        // Check if this is back to the original state
                        const originalState = {
                          is_available: table.availability?.is_available ?? true,
                          override_minimum_spend: table.availability?.override_minimum_spend ?? null,
                          override_deposit: table.availability?.override_deposit ?? null,
                          notes: table.availability?.notes ?? null,
                        };

                        const isUnchanged =
                          newState.is_available === originalState.is_available &&
                          newState.override_minimum_spend === originalState.override_minimum_spend &&
                          newState.override_deposit === originalState.override_deposit &&
                          newState.notes === originalState.notes;

                        setTableChanges((prev) => {
                          const next = new Map(prev);
                          if (isUnchanged) {
                            next.delete(tableId);
                          } else {
                            next.set(tableId, newState);
                          }
                          return next;
                        });
                      };

                      return (
                        <div key={zoneGroup.zone.id} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-glass/50 px-4 py-3 border-b border-border">
                            <h3 className="font-semibold text-primary">{zoneGroup.zone.name}</h3>
                          </div>
                          <div className="divide-y divide-border">
                            {zoneGroup.tables.map((table) => {
                              const state = getTableState(table);
                              const hasChanges = tableChanges.has(table.id);

                              return (
                                <div
                                  key={table.id}
                                  className={`px-4 py-3 ${hasChanges ? "bg-accent-primary/5" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-primary">{table.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {table.capacity} seats
                                        </Badge>
                                        {hasChanges && (
                                          <Badge variant="secondary" className="text-xs bg-accent-primary/20">
                                            Modified
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-secondary mt-1">
                                        Default: {table.minimum_spend ? `${getCurrencySymbol(tablesCurrency)}${table.minimum_spend} min` : "No minimum"}
                                        {table.deposit_amount ? ` / ${getCurrencySymbol(tablesCurrency)}${table.deposit_amount} deposit` : ""}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant={state.is_available ? "primary" : "ghost"}
                                        size="sm"
                                        onClick={() => updateTable(table.id, "is_available", !state.is_available)}
                                      >
                                        {state.is_available ? (
                                          <>
                                            <Check className="h-4 w-4 mr-1" />
                                            Available
                                          </>
                                        ) : (
                                          <>
                                            <X className="h-4 w-4 mr-1" />
                                            Unavailable
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Override Fields */}
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="text-xs text-secondary block mb-1">
                                        Min Spend Override
                                      </label>
                                      <Input
                                        type="number"
                                        placeholder={table.minimum_spend ? `${getCurrencySymbol(tablesCurrency)}${table.minimum_spend}` : "No minimum"}
                                        value={state.override_minimum_spend ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateTable(table.id, "override_minimum_spend", val);
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-secondary block mb-1">
                                        Deposit Override
                                      </label>
                                      <Input
                                        type="number"
                                        placeholder={table.deposit_amount ? `${getCurrencySymbol(tablesCurrency)}${table.deposit_amount}` : "No deposit"}
                                        value={state.override_deposit ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseFloat(e.target.value) : null;
                                          updateTable(table.id, "override_deposit", val);
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs text-secondary block mb-1">
                                        Notes
                                      </label>
                                      <Input
                                        type="text"
                                        placeholder="e.g., Reserved for Smith party"
                                        value={state.notes ?? ""}
                                        onChange={(e) => {
                                          const val = e.target.value || null;
                                          updateTable(table.id, "notes", val);
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          {/* Bookings Tab - Venue, Organizer, and Admin */}
          {config.canViewBookings && (config.role === "venue" || config.role === "organizer" || config.role === "admin") && (
            <TabsContent value="bookings" className="space-y-4">
              <Card>
                <div className="mb-4">
                  <h2 className="section-header !mb-0">Table Bookings</h2>
                  <p className="text-sm text-secondary mt-1">
                    Manage table booking requests for this event.
                  </p>
                </div>
                <BookingsTab
                  eventId={event.id}
                  apiBasePath={config.role === "admin" ? "/api/admin/events" : "/api/venue/events"}
                />
              </Card>
            </TabsContent>
          )}

          {/* Venue Pulse (Feedback) Tab */}
          {config.role === "venue" && (
            <TabsContent value="feedback" className="space-y-4">
              <VenueFeedbackPanel eventId={eventId} />
            </TabsContent>
          )}
        </Tabs>
      ) : (
        // No tabs - show simple layout (for promoter or minimal views)
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="section-header">Event Details</h3>
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
              {event.max_guestlist_size && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Guestlist Limit</p>
                    <p className="text-sm text-secondary">{event.max_guestlist_size} spots</p>
                  </div>
                </div>
              )}
              {event.venue?.capacity && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Venue Capacity</p>
                    <p className="text-sm text-secondary">{event.venue.capacity.toLocaleString()} max</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="section-header">Description</h3>
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
            <Textarea
              label="Important Info for Guests"
              value={editForm.important_info}
              onChange={(e) => setEditForm((prev) => ({ ...prev, important_info: e.target.value }))}
              rows={2}
              placeholder="e.g., Arrive before 10pm, Dress code: Smart casual, Bring ID"
              helperText="This will be shown in registration confirmation and reminder emails"
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
                label={editForm.has_guestlist ? "Max Guestlist Size (Required)" : "Max Guestlist Size"}
                type="number"
                required={editForm.has_guestlist}
                value={editForm.max_guestlist_size}
                onChange={(e) => setEditForm((prev) => ({ ...prev, max_guestlist_size: e.target.value }))}
                placeholder="Leave empty for unlimited"
                helperText={editForm.has_guestlist 
                  ? "Maximum number of guestlist registrations allowed for this event" 
                  : "Maximum number of guestlist registrations. Leave empty if this event has no limit."}
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
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Timezone</label>
              <select
                value={editForm.timezone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
              >
                {Object.entries(TIMEZONE_GROUPS).map(([region, timezones]) => (
                  <optgroup key={region} label={region}>
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label} ({tz.offset})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="text-xs text-secondary mt-1">Timezone for event times</p>
            </div>

            {/* Registration Settings */}
            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-primary">Registration Settings</h3>
              
              {/* Guestlist Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Enable Guestlist Registration</label>
                  <p className="text-xs text-secondary">Attendees can register directly through CrowdStack with QR check-in</p>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.has_guestlist}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, has_guestlist: e.target.checked }))}
                  className="w-5 h-5 rounded border-border text-accent-primary focus:ring-accent-primary"
                />
              </div>

              {/* Ticket Sales Mode */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Ticket Sales</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticket_sale_mode"
                      value="none"
                      checked={editForm.ticket_sale_mode === "none"}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_sale_mode: e.target.value as "none" | "external" | "internal" }))}
                      className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-sm text-primary">None - No ticket sales</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ticket_sale_mode"
                      value="external"
                      checked={editForm.ticket_sale_mode === "external"}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_sale_mode: e.target.value as "none" | "external" | "internal" }))}
                      className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-sm text-primary">External - Link to external ticketing (RA, Eventbrite, etc.)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer opacity-50">
                    <input
                      type="radio"
                      name="ticket_sale_mode"
                      value="internal"
                      checked={editForm.ticket_sale_mode === "internal"}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_sale_mode: e.target.value as "none" | "external" | "internal" }))}
                      disabled
                      className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                    />
                    <span className="text-sm text-primary">Internal - CrowdStack ticketing (coming soon)</span>
                  </label>
                </div>
              </div>

              {editForm.ticket_sale_mode === "external" && (
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

              {/* Public Event Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Public Event</label>
                  <p className="text-xs text-secondary">Event will be visible in public listings</p>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                  className="w-5 h-5 rounded border-border text-accent-primary focus:ring-accent-primary"
                />
              </div>
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
                  // For files over 4MB, use direct Supabase upload to bypass Vercel's 4.5MB limit
                  const FOUR_MB = 4 * 1024 * 1024;
                  
                  if (file.size > FOUR_MB) {
                    // Get signed upload URL
                    const urlResponse = await fetch(
                      `/api/organizer/events/${eventId}/flier/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&fileSize=${file.size}`
                    );
                    
                    if (!urlResponse.ok) {
                      const error = await urlResponse.json();
                      throw new Error(error.error || "Failed to get upload URL");
                    }
                    
                    const { uploadUrl, storagePath } = await urlResponse.json();
                    
                    // Upload directly to Supabase Storage
                    const uploadResponse = await fetch(uploadUrl, {
                      method: "PUT",
                      body: file,
                      headers: {
                        "Content-Type": file.type,
                      },
                    });
                    
                    if (!uploadResponse.ok) {
                      throw new Error("Failed to upload file to storage");
                    }
                    
                    // Get public URL
                    const supabase = createBrowserClient();
                    const { data: { publicUrl } } = supabase.storage
                      .from("event-photos")
                      .getPublicUrl(storagePath);
                    
                    // Update event with flier URL
                    const updateResponse = await fetch(`/api/organizer/events/${eventId}/flier`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ flier_url: publicUrl }),
                    });
                    
                    if (!updateResponse.ok) {
                      const error = await updateResponse.json();
                      throw new Error(error.error || "Failed to update event");
                    }
                    
                    await loadEventData(false);
                    return publicUrl;
                  } else {
                    // For smaller files, use the existing API route
                    const formData = new FormData();
                    formData.append("file", file);
                    const response = await fetch(`/api/organizer/events/${eventId}/flier`, {
                      method: "POST",
                      body: formData,
                    });
                    if (!response.ok) {
                      // Handle non-JSON error responses (e.g., "Request Entity Too Large")
                      let errorMessage = "Failed to upload flier";
                      try {
                        const error = await response.json();
                        errorMessage = error.error || errorMessage;
                      } catch {
                        // Response is not JSON, try to get text
                        try {
                          const text = await response.text();
                          if (text.includes("Request Entity Too Large") || text.includes("413")) {
                            errorMessage = "File is too large. Please use an image under 10MB.";
                          } else if (text) {
                            errorMessage = text.substring(0, 100);
                          }
                        } catch {
                          // Ignore text parsing errors
                        }
                      }
                      throw new Error(errorMessage);
                    }
                    const data = await response.json();
                    await loadEventData(false); // Refresh event data without resetting form
                    return data.flier_url;
                  }
                }}
                onRemove={async () => {
                  // Delete flier via DELETE endpoint
                  const response = await fetch(`/api/organizer/events/${eventId}/flier`, {
                    method: "DELETE",
                  });
                  if (!response.ok) {
                    let errorMessage = "Failed to remove flier";
                    try {
                      const errorData = await response.json();
                      errorMessage = errorData.error || errorMessage;
                    } catch {
                      // Response is not JSON
                    }
                    throw new Error(errorMessage);
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
                            
                            const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

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
                                // Supabase StorageError has statusCode property
                                const storageError = uploadError as { message?: string; statusCode?: number };
                                
                                if (process.env.NODE_ENV === "development") {
                                  console.error(`[VideoFlier Client] Supabase upload failed:`, {
                                    message: uploadError.message,
                                    statusCode: storageError.statusCode,
                                    error: uploadError,
                                    fileSize: `${actualFileSizeMB}MB`,
                                    fileName: file.name
                                  });
                                }
                                
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
                                         storageError.statusCode === 403) {
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
                    
                    if (!res.ok) {
                      toast.error("Search failed", data.error || `Error: ${res.status}`);
                      setFoundUser(null);
                      return;
                    }
                    
                    if (data.results && data.results.length > 0) {
                      // Find exact email match first, or use first result
                      const exactMatch = data.results.find((r: any) => r.email?.toLowerCase() === transferEmail.toLowerCase());
                      const user = exactMatch || data.results[0];
                      setFoundUser({ id: user.id, email: user.email });
                    } else {
                      toast.error("User not found", "No user found with that email address.");
                      setFoundUser(null);
                    }
                  } catch (error: any) {
                    toast.error("Search failed", error.message || "Could not search for user.");
                    setFoundUser(null);
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

      {/* Referral QR Code Modal (for promoters, organizers, and venues) */}
      {showQRModal && (config.role === "promoter" || config.role === "organizer" || config.role === "venue") && event && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Surface variant="void" className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="section-header !mb-0">
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


