-- Fix Supabase Security Linter Issues
-- ============================================
-- 1. Enable RLS on event_tags table (policies exist but RLS was never enabled)
-- 2. Fix data_summary view SECURITY DEFINER issue
-- ============================================

-- ============================================
-- 1. ENABLE RLS ON event_tags TABLE
-- ============================================

-- Enable RLS on event_tags (policies already exist from migration 095)
ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.event_tags IS 'Music tags for events. Tag values should use VENUE_EVENT_GENRES constant. RLS enabled for security.';

-- ============================================
-- 2. FIX data_summary VIEW SECURITY DEFINER ISSUE
-- ============================================

-- The data_summary view is not used in application code (only for debugging)
-- Since Supabase flags views owned by superuser roles as SECURITY DEFINER,
-- and we cannot reliably change ownership to a non-superuser role,
-- we'll drop the view. If needed for debugging, counts can be queried directly.

DROP VIEW IF EXISTS public.data_summary CASCADE;

-- Note: If you need this view for debugging, you can recreate it, but Supabase
-- will continue to flag it as SECURITY DEFINER if owned by a superuser role.
-- This is a known limitation - the view itself is safe as it only counts public tables.

