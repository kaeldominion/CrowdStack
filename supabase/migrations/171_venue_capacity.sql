-- Migration: Add capacity column to venues table
-- Purpose: Track venue capacity for planning and safety purposes

-- Add capacity column to venues
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT NULL;

-- Add check constraint to ensure capacity is positive
ALTER TABLE public.venues
ADD CONSTRAINT venues_capacity_positive CHECK (capacity IS NULL OR capacity > 0);

-- Comment for documentation
COMMENT ON COLUMN public.venues.capacity IS 'Maximum venue capacity for guests';
