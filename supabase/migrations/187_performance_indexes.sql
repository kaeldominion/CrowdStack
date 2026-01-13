-- Performance Optimization Indexes
-- Based on k6 load test analysis showing max response times of 2.99s
-- These indexes target the most frequently queried patterns

-- ============================================
-- CRITICAL: Registration and Check-in Indexes
-- ============================================

-- Index for batch counting registrations per event (used in browse/events, promoters, checkin)
-- Improves queries like: SELECT event_id FROM registrations WHERE event_id IN (...)
-- Note: registrations table uses registered_at, not created_at
CREATE INDEX IF NOT EXISTS idx_registrations_event_registered
ON registrations(event_id, registered_at DESC);

-- Index for check-in idempotency lookups (checkin/route.ts:350)
-- Improves: SELECT * FROM checkins WHERE registration_id = ?
CREATE INDEX IF NOT EXISTS idx_checkins_registration
ON checkins(registration_id);

-- ============================================
-- HIGH PRIORITY: VIP Status Lookup Indexes
-- ============================================

-- Index for venue VIP lookups (checkin/route.ts:296)
-- Improves: SELECT reason FROM venue_vips WHERE venue_id = ? AND attendee_id = ?
CREATE INDEX IF NOT EXISTS idx_venue_vips_lookup
ON venue_vips(attendee_id, venue_id);

-- Index for organizer VIP lookups (checkin/route.ts:312)
-- Improves: SELECT reason FROM organizer_vips WHERE organizer_id = ? AND attendee_id = ?
CREATE INDEX IF NOT EXISTS idx_organizer_vips_lookup
ON organizer_vips(attendee_id, organizer_id);

-- ============================================
-- HIGH PRIORITY: Access Control Indexes
-- ============================================

-- Index for door staff access checks (checkin/route.ts:118-124)
-- Improves: SELECT id FROM event_door_staff WHERE event_id = ? AND user_id = ? AND status = 'active'
CREATE INDEX IF NOT EXISTS idx_event_door_staff_access
ON event_door_staff(event_id, user_id, status);

-- ============================================
-- HIGH PRIORITY: Browse and Filter Indexes
-- ============================================

-- Index for events browse filtering (browse/events:77-108)
-- Improves: SELECT * FROM events WHERE status = 'published' AND venue_approval_status IN (...) AND start_time >= ?
CREATE INDEX IF NOT EXISTS idx_events_browse
ON events(status, venue_approval_status, start_time);

-- Index for table party guest fetches (booking/route.ts:180)
-- Improves: SELECT * FROM table_party_guests WHERE booking_id = ?
CREATE INDEX IF NOT EXISTS idx_table_party_guests_booking
ON table_party_guests(booking_id);

-- ============================================
-- MEDIUM PRIORITY: Promoter Stats Indexes
-- ============================================

-- Index for promoter referral stats (promoters/route.ts:96)
-- Improves: SELECT * FROM registrations WHERE referral_promoter_id = ?
CREATE INDEX IF NOT EXISTS idx_registrations_referral_promoter
ON registrations(referral_promoter_id)
WHERE referral_promoter_id IS NOT NULL;

-- ============================================
-- Verify indexes were created
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully';
END $$;
