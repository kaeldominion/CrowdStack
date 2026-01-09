-- Additional Performance Indexes
-- Identified during code review for N+1 query optimization
-- These indexes target the most common query patterns in the application

-- ============================================
-- REGISTRATIONS TABLE - Extended Indexes
-- ============================================

-- Index for attendee lookups in check-in and event management flows
-- Used in: WHERE attendee_id = ? with event_id
CREATE INDEX IF NOT EXISTS idx_registrations_attendee_event
  ON public.registrations(attendee_id, event_id);

-- Extended promoter referral index with event context
-- Used in: stats building, payout calculations
CREATE INDEX IF NOT EXISTS idx_registrations_promoter_event_stats
  ON public.registrations(referral_promoter_id, event_id)
  WHERE referral_promoter_id IS NOT NULL;

-- ============================================
-- CHECKINS TABLE - Extended Indexes
-- ============================================

-- Index for promoter checkin statistics (bonus calculations)
-- Used in: WHERE registration_id IN (...) AND undo_at IS NULL
CREATE INDEX IF NOT EXISTS idx_checkins_for_stats
  ON public.checkins(registration_id, checked_in_at)
  WHERE undo_at IS NULL;

-- ============================================
-- VIP TABLES - Indexes for VIP lookups
-- ============================================

-- Index for organizer VIP lookups
CREATE INDEX IF NOT EXISTS idx_organizer_vips_attendee_lookup
  ON public.organizer_vips(attendee_id, organizer_id);

-- Index for venue VIP lookups
CREATE INDEX IF NOT EXISTS idx_venue_vips_attendee_lookup
  ON public.venue_vips(attendee_id, venue_id);

-- ============================================
-- EVENT PROMOTERS TABLE
-- ============================================

-- Index for promoter assignments lookup
CREATE INDEX IF NOT EXISTS idx_event_promoters_lookup
  ON public.event_promoters(event_id, promoter_id);

-- Index for promoter's events list
CREATE INDEX IF NOT EXISTS idx_event_promoters_by_promoter
  ON public.event_promoters(promoter_id, event_id);

-- ============================================
-- DOOR STAFF TABLE
-- ============================================

-- Index for door staff access checks (high-frequency during events)
CREATE INDEX IF NOT EXISTS idx_event_door_staff_access
  ON public.event_door_staff(event_id, user_id, status)
  WHERE status = 'active';

-- ============================================
-- USER ROLES TABLE
-- ============================================

-- Index for role lookups (called on every authenticated request)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_lookup
  ON public.user_roles(user_id);

-- ============================================
-- PROMOTERS TABLE
-- ============================================

-- Index for promoter created_by lookups (owner checks)
CREATE INDEX IF NOT EXISTS idx_promoters_created_by
  ON public.promoters(created_by);

-- ============================================
-- ATTENDEES TABLE
-- ============================================

-- Index for email lookups (user search, deduplication)
CREATE INDEX IF NOT EXISTS idx_attendees_email_lookup
  ON public.attendees(email)
  WHERE email IS NOT NULL;

-- Index for phone lookups (user search, deduplication)
CREATE INDEX IF NOT EXISTS idx_attendees_phone_lookup
  ON public.attendees(phone)
  WHERE phone IS NOT NULL;

-- Index for user_id lookups (linking attendees to users)
CREATE INDEX IF NOT EXISTS idx_attendees_user_id
  ON public.attendees(user_id)
  WHERE user_id IS NOT NULL;

-- ============================================
-- EVENTS TABLE - Additional Indexes
-- ============================================

-- Index for venue's events lookup
CREATE INDEX IF NOT EXISTS idx_events_venue_lookup
  ON public.events(venue_id);

-- Index for organizer's events lookup
CREATE INDEX IF NOT EXISTS idx_events_organizer_lookup
  ON public.events(organizer_id);

-- ============================================
-- EMAIL SEND LOGS TABLE
-- ============================================

-- Index for duplicate email detection (uses actual column names)
-- Note: event_id is stored in metadata JSONB, already indexed in migration 109
CREATE INDEX IF NOT EXISTS idx_email_send_logs_dedup
  ON public.email_send_logs(template_slug, recipient, sent_at DESC);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

-- Index for user activity history
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_lookup
  ON public.activity_logs(user_id, created_at DESC);

-- ============================================
-- XP LEDGER TABLE
-- ============================================

-- Note: xp_ledger schema varies between environments
-- Skipping index creation - existing indexes should suffice

-- ============================================
-- UPDATE STATISTICS
-- ============================================

ANALYZE public.registrations;
ANALYZE public.checkins;
ANALYZE public.event_promoters;
ANALYZE public.event_door_staff;
ANALYZE public.user_roles;
ANALYZE public.attendees;
ANALYZE public.promoters;
ANALYZE public.events;

-- Add comments for documentation
COMMENT ON INDEX idx_registrations_attendee_event IS 'Optimizes attendee registration lookups in check-in flow';
COMMENT ON INDEX idx_event_door_staff_access IS 'Optimizes door staff access checks during events';
COMMENT ON INDEX idx_user_roles_user_lookup IS 'Optimizes role checks on authenticated requests';
COMMENT ON INDEX idx_event_promoters_lookup IS 'Optimizes promoter assignment lookups';
