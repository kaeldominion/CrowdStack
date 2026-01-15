-- Migration: Gender-Based Check-in Cutoff Times
-- Allows organizers to set different cutoff times for male and female attendees

-- Rename existing column to male-specific
ALTER TABLE public.events
RENAME COLUMN checkin_cutoff_time TO checkin_cutoff_time_male;

-- Add female cutoff time column
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_cutoff_time_female TIME DEFAULT NULL;

-- Update comments
COMMENT ON COLUMN public.events.checkin_cutoff_time_male IS 'Cutoff time for male attendees. Also used as default when attendee gender is unknown. Format: HH:MM:SS';
COMMENT ON COLUMN public.events.checkin_cutoff_time_female IS 'Cutoff time for female attendees. Format: HH:MM:SS';
