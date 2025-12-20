-- Add timezone field to events
-- First add the column as nullable with default
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Update existing events to have a default timezone if null
UPDATE public.events
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

-- Now set NOT NULL constraint
ALTER TABLE public.events
ALTER COLUMN timezone SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.events.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London) for the event location';

