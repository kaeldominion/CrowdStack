-- Performance Optimization: Add Missing Indexes
-- This migration adds critical indexes for common query patterns identified in load testing

-- ============================================
-- EVENTS TABLE INDEXES
-- ============================================

-- Index for time-based queries (homepage, browse events)
-- Used in: WHERE start_time >= ? AND status = 'published'
CREATE INDEX IF NOT EXISTS idx_events_start_time_status 
  ON public.events(start_time, status) 
  WHERE status = 'published';

-- Index for venue approval status filtering (homepage query)
-- Used in: WHERE venue_approval_status IN ('approved', 'not_required')
CREATE INDEX IF NOT EXISTS idx_events_venue_approval_status 
  ON public.events(venue_approval_status) 
  WHERE venue_approval_status IN ('approved', 'not_required');

-- Composite index for homepage featured events query
-- Used in: WHERE status = 'published' AND venue_approval_status IN (...) AND start_time >= ?
CREATE INDEX IF NOT EXISTS idx_events_homepage_query 
  ON public.events(status, venue_approval_status, start_time) 
  WHERE status = 'published' 
    AND venue_approval_status IN ('approved', 'not_required');

-- Index for registration_type filtering
CREATE INDEX IF NOT EXISTS idx_events_registration_type 
  ON public.events(registration_type) 
  WHERE registration_type IS NOT NULL;

-- Index for live events queries (started but not ended)
-- Used in: WHERE start_time <= now() AND (end_time IS NULL OR end_time >= now())
CREATE INDEX IF NOT EXISTS idx_events_live 
  ON public.events(start_time, end_time, status) 
  WHERE status = 'published';

-- Index for featured events (if column exists)
-- This will be created conditionally
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'events' 
    AND column_name = 'is_featured'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_events_is_featured 
      ON public.events(is_featured, start_time, status) 
      WHERE is_featured = true AND status = 'published';
  END IF;
END $$;

-- ============================================
-- REGISTRATIONS TABLE INDEXES
-- ============================================

-- Composite index for event registration counts (used in homepage)
-- Used in: SELECT count(*) FROM registrations WHERE event_id = ?
CREATE INDEX IF NOT EXISTS idx_registrations_event_id_count 
  ON public.registrations(event_id);

-- Index for referral tracking queries
CREATE INDEX IF NOT EXISTS idx_registrations_referral_promoter 
  ON public.registrations(referral_promoter_id) 
  WHERE referral_promoter_id IS NOT NULL;

-- Index for user referral tracking
CREATE INDEX IF NOT EXISTS idx_registrations_referred_by_user 
  ON public.registrations(referred_by_user_id) 
  WHERE referred_by_user_id IS NOT NULL;

-- ============================================
-- VENUES TABLE INDEXES
-- ============================================

-- Index for city filtering (browse venues)
CREATE INDEX IF NOT EXISTS idx_venues_city 
  ON public.venues(city) 
  WHERE city IS NOT NULL;

-- Index for slug lookups (venue detail pages)
-- Note: slug already has UNIQUE constraint which creates an index, but this ensures it exists
CREATE INDEX IF NOT EXISTS idx_venues_slug_lookup 
  ON public.venues(slug) 
  WHERE slug IS NOT NULL;

-- ============================================
-- VENUE_TAGS TABLE INDEXES
-- ============================================

-- Index for music tag filtering (genre search)
CREATE INDEX IF NOT EXISTS idx_venue_tags_music 
  ON public.venue_tags(venue_id, tag_type, tag_value) 
  WHERE tag_type = 'music';

-- ============================================
-- EVENT_TAGS TABLE INDEXES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'event_tags'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_event_tags_music 
      ON public.event_tags(event_id, tag_type, tag_value) 
      WHERE tag_type = 'music';
  END IF;
END $$;

-- ============================================
-- CHECKINS TABLE INDEXES
-- ============================================

-- Index for check-in counts per event
CREATE INDEX IF NOT EXISTS idx_checkins_registration_event 
  ON public.checkins(registration_id) 
  WHERE undo_at IS NULL;

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update table statistics for query planner
ANALYZE public.events;
ANALYZE public.registrations;
ANALYZE public.venues;
ANALYZE public.venue_tags;
ANALYZE public.checkins;

COMMENT ON INDEX idx_events_start_time_status IS 'Optimizes time-based event queries (homepage, browse)';
COMMENT ON INDEX idx_events_homepage_query IS 'Optimizes homepage featured events query';
COMMENT ON INDEX idx_registrations_event_id_count IS 'Optimizes registration count queries';

