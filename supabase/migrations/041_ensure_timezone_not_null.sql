-- Ensure timezone column is NOT NULL (in case migration 040 was run without it)
-- First, update any null values
UPDATE public.events
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

-- Then set NOT NULL constraint (this will fail if there are still nulls, which means the above worked)
ALTER TABLE public.events
ALTER COLUMN timezone SET NOT NULL;

-- Ensure default is set
ALTER TABLE public.events
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

