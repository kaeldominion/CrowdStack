-- Add video flier support for events
-- Video fliers are optional enhancements to static image fliers
-- Can be used for premium/subscription features

-- Add video URL column
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS flier_video_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.events.flier_video_url IS 'Optional video flier URL (9:16 format, max 30 seconds recommended). Premium feature for enhanced event promotion.';

