-- Add Instagram field to venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

COMMENT ON COLUMN public.venues.instagram_url IS 'Instagram profile URL or handle';

