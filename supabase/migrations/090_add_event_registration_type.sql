-- Add registration_type to events table
-- Allows events to be guestlist (default), display_only (info only), or external_link (redirect to external ticketing)

-- Add registration_type column
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'guestlist' 
CHECK (registration_type IN ('guestlist', 'display_only', 'external_link'));

-- Add external_ticket_url for external_link type
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS external_ticket_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.events.registration_type IS 'Controls registration behavior: guestlist (CrowdStack registration), display_only (info only, no registration), external_link (redirect to external ticketing URL)';
COMMENT ON COLUMN public.events.external_ticket_url IS 'External ticketing URL (e.g., RA, Eventbrite) - only used when registration_type is external_link';

-- Update existing events to have the default value
UPDATE public.events 
SET registration_type = 'guestlist' 
WHERE registration_type IS NULL;

