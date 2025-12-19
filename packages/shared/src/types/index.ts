// Shared types across the application

export type AppEnvironment = "local" | "beta" | "prod";

export interface AppConfig {
  env: AppEnvironment;
  version: string;
  supabaseUrl: string;
  webUrl: string;
  appUrl: string;
}

export interface HealthCheckResult {
  status: "ok" | "error";
  message: string;
  timestamp: string;
  supabaseConnected: boolean;
}

// ============================================
// Role Types
// ============================================

export type UserRole =
  | "superadmin"
  | "venue_admin"
  | "event_organizer"
  | "promoter"
  | "door_staff"
  | "attendee";

// ============================================
// Database Table Types
// ============================================

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InviteToken {
  id: string;
  token: string;
  role: UserRole;
  metadata: Record<string, any>;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  parent_promoter_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendee {
  id: string;
  name: string;
  surname?: string | null;
  email: string | null;
  phone: string;
  whatsapp?: string | null;
  date_of_birth?: string | null; // ISO date string
  avatar_url?: string | null;
  bio?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export type EventStatus = "draft" | "published" | "ended";

export interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  venue_id: string | null;
  organizer_id: string;
  start_time: string;
  end_time: string | null;
  status: EventStatus;
  capacity: number | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
}

export type CommissionType = "flat_per_head" | "tiered_thresholds";

export interface CommissionConfig {
  flat_per_head?: number;
  tiered_thresholds?: Array<{
    threshold: number;
    amount: number;
  }>;
}

export interface EventPromoter {
  id: string;
  event_id: string;
  promoter_id: string;
  commission_type: CommissionType;
  commission_config: CommissionConfig;
  created_at: string;
}

export interface Registration {
  id: string;
  attendee_id: string;
  event_id: string;
  referral_promoter_id: string | null;
  registered_at: string;
}

export interface Checkin {
  id: string;
  registration_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  undo_at: string | null;
  undo_by: string | null;
}

export type QuestionType = "text" | "select" | "checkbox";

export interface EventQuestion {
  id: string;
  event_id: string;
  question_text: string;
  question_type: QuestionType;
  options: Record<string, any> | null;
  required: boolean;
  display_order: number;
  created_at: string;
}

export interface EventAnswer {
  id: string;
  registration_id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: Record<string, any> | null;
  created_at: string;
}

export interface XPLedger {
  id: string;
  event_id: string | null;
  attendee_id: string;
  amount: number;
  reason: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GuestFlag {
  id: string;
  attendee_id: string;
  venue_id: string;
  reason: string;
  flagged_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export type AlbumStatus = "draft" | "published";

export interface PhotoAlbum {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  status: AlbumStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
}

export interface PayoutRun {
  id: string;
  event_id: string;
  generated_at: string;
  generated_by: string | null;
  locked_at: string | null;
  statement_pdf_path: string | null;
}

export interface PayoutLine {
  id: string;
  payout_run_id: string;
  promoter_id: string;
  checkins_count: number;
  commission_amount: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type MessageStatus = "pending" | "sent" | "failed";

export interface MessageLog {
  id: string;
  recipient: string;
  subject: string;
  status: MessageStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export type AudienceType = "venue" | "organizer" | "promoter" | "event";
export type AudienceMessageStatus = "queued" | "processing" | "sent" | "failed";

export interface AudienceMessage {
  id: string;
  sender_id: string;
  audience_type: AudienceType;
  audience_id: string;
  subject: string;
  body: string;
  recipient_count: number;
  status: AudienceMessageStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type OutboxEventType =
  | "event_created"
  | "registration_created"
  | "attendee_checked_in"
  | "photos_published"
  | "payout_generated"
  | "weekly_digest_ready";

export interface EventOutbox {
  id: string;
  event_type: OutboxEventType;
  payload: Record<string, any>;
  processed_at: string | null;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface RegisterEventRequest {
  name: string;
  surname?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  date_of_birth?: string; // ISO date string
  instagram_handle?: string;
  tiktok_handle?: string;
  answers?: Record<string, string | string[]>;
}

export interface RegisterEventResponse {
  registration: Registration;
  qr_pass_token: string;
  attendee: Attendee;
}

export interface CheckinRequest {
  qr_token?: string;
  registration_id?: string;
}

export interface CheckinResponse {
  success: boolean;
  checkin: Checkin | null;
  message?: string;
}

export type PromoterAccessType = "public" | "invite_only";

export interface CreateEventRequest {
  name: string;
  slug: string;
  description?: string;
  venue_id?: string;
  organizer_id?: string;
  start_time: string;
  end_time?: string;
  capacity?: number;
  cover_image_url?: string;
  promoter_access_type?: PromoterAccessType;
  self_promote?: boolean;
  promoters?: Array<{
    promoter_id: string;
    commission_type: CommissionType;
    commission_config: CommissionConfig;
  }>;
}

export interface CreateEventResponse {
  event: Event;
}

export interface QuickAddRequest {
  name: string;
  phone: string;
  email?: string;
  promoter_id?: string;
  notes?: string;
}

export interface QuickAddResponse {
  attendee: Attendee;
  registration: Registration;
  checkin: Checkin;
}

export interface InviteAcceptRequest {
  token: string;
}

export interface InviteAcceptResponse {
  success: boolean;
  role: UserRole;
  redirect_url: string;
}

// ============================================
// QR Pass JWT Payload
// ============================================

export interface QRPassPayload {
  registration_id: string;
  event_id: string;
  attendee_id: string;
  iat?: number;
  exp?: number;
}

// ============================================
// Invite Token Payload
// ============================================

export interface InviteTokenPayload {
  role: UserRole;
  metadata?: Record<string, any>;
}

// ============================================
// Analytics Types
// ============================================

export interface EventTotals {
  event_id: string;
  registrations_count: number;
  checkins_count: number;
  no_shows_count: number;
}

export interface PromoterLeaderboard {
  promoter_id: string;
  promoter_name: string;
  checkins_count: number;
  registrations_count: number;
  conversion_percentage: number;
  no_show_percentage: number;
}

export interface VenueSummary {
  venue_id: string;
  month: string;
  events_count: number;
  total_checkins: number;
  repeat_attendance_percentage: number;
}

