-- Migration: Add currency support to venues and events
-- Venues have a base currency, events can override

-- Add currency to venues (default USD)
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add currency override to events (null = use venue default)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.venues.currency IS 'Base currency for the venue (ISO 4217 code, e.g., USD, EUR, GBP)';
COMMENT ON COLUMN public.events.currency IS 'Currency override for this event. If null, uses venue currency.';
