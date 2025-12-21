-- Add mobile_style field to events table for A/B testing
-- 'scroll' = scroll-style parallax experience (default)
-- 'flip' = flip card style experience

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS mobile_style TEXT DEFAULT 'scroll' 
CHECK (mobile_style IN ('flip', 'scroll'));

-- Add comment for documentation
COMMENT ON COLUMN events.mobile_style IS 'Mobile event page style: scroll (default) or flip for A/B testing';
