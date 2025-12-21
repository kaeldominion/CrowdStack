-- Add mobile_style field to events table for A/B testing
-- 'flip' = current flip-style experience (default)
-- 'scroll' = scroll-style parallax experience

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS mobile_style TEXT DEFAULT 'flip' 
CHECK (mobile_style IN ('flip', 'scroll'));

-- Add comment for documentation
COMMENT ON COLUMN events.mobile_style IS 'Mobile event page style: flip (default) or scroll for A/B testing';

