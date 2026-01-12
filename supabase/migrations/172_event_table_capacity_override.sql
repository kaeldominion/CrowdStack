-- Add capacity override to event_table_availability
-- This allows events to override the default table capacity set at venue level

ALTER TABLE public.event_table_availability
ADD COLUMN IF NOT EXISTS override_capacity INTEGER DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.event_table_availability.override_capacity IS
  'Event-specific override for table capacity. If NULL, uses venue_tables.capacity';
