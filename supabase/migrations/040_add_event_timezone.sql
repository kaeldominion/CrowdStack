-- Add timezone field to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add comment
COMMENT ON COLUMN public.events.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London) for the event location';

-- Update existing events to have a default timezone if null (optional, but good practice)
UPDATE public.events
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

