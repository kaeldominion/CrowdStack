-- Refactor Registration Type to Feature Flags
-- Replaces registration_type enum with independent feature flags for better flexibility
-- and future support for internal ticketing

-- ============================================================================
-- 1. ADD NEW COLUMNS
-- ============================================================================

-- Add has_guestlist column (controls CrowdStack guestlist registration)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS has_guestlist BOOLEAN DEFAULT true;

-- Add ticket_sale_mode column (controls ticket sales: none, external, or internal)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS ticket_sale_mode TEXT DEFAULT 'none';

-- Add constraint for valid ticket sale modes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_ticket_sale_mode_check'
  ) THEN
    ALTER TABLE public.events
    ADD CONSTRAINT events_ticket_sale_mode_check
    CHECK (ticket_sale_mode IN ('none', 'external', 'internal'));
  END IF;
END $$;

-- Add is_public column (controls public visibility)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA
-- ============================================================================

-- Migrate from registration_type to new fields
-- guestlist -> has_guestlist=true, ticket_sale_mode='none', is_public=true
UPDATE public.events
SET 
  has_guestlist = true,
  ticket_sale_mode = 'none',
  is_public = true
WHERE registration_type = 'guestlist' OR registration_type IS NULL;

-- external_link -> has_guestlist=false, ticket_sale_mode='external', is_public=true
UPDATE public.events
SET 
  has_guestlist = false,
  ticket_sale_mode = 'external',
  is_public = true
WHERE registration_type = 'external_link';

-- display_only -> has_guestlist=false, ticket_sale_mode='none', is_public=false
UPDATE public.events
SET 
  has_guestlist = false,
  ticket_sale_mode = 'none',
  is_public = false
WHERE registration_type = 'display_only';

-- ============================================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.events.has_guestlist IS 'Controls whether attendees can register through CrowdStack guestlist with QR check-in';
COMMENT ON COLUMN public.events.ticket_sale_mode IS 'Controls ticket sales: none (no tickets), external (link to external ticketing), internal (CrowdStack ticketing - future)';
COMMENT ON COLUMN public.events.is_public IS 'Controls whether event is visible in public listings';
COMMENT ON COLUMN public.events.external_ticket_url IS 'External ticketing URL (e.g., RA, Eventbrite) - used when ticket_sale_mode is external';

-- Note: registration_type column is kept temporarily for backward compatibility
-- It will be removed in a future migration after all code is updated
