-- Migration: Check-in Cutoff Time Feature
-- Allows organizers to set a time after which check-ins trigger a soft warning for door staff

-- Add cutoff settings to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_cutoff_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_cutoff_time TIME DEFAULT NULL;

COMMENT ON COLUMN public.events.checkin_cutoff_enabled IS 'When true, check-ins after cutoff_time trigger a soft warning requiring door staff override';
COMMENT ON COLUMN public.events.checkin_cutoff_time IS 'Time of day (in event timezone) after which check-ins require override. Format: HH:MM:SS';

-- Track overrides in checkins table
ALTER TABLE public.checkins
ADD COLUMN IF NOT EXISTS cutoff_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cutoff_override_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN public.checkins.cutoff_override IS 'True if this check-in was performed after the cutoff time with door staff override';
COMMENT ON COLUMN public.checkins.cutoff_override_reason IS 'Optional reason provided by door staff for allowing late check-in';
