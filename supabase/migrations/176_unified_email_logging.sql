-- Unified Email Logging System
-- Enhances email_send_logs table to capture ALL emails sent by the platform
-- Integrates Postmark feedback (opens/clicks/bounces) with proper tracking

-- ============================================
-- 1. ADD NEW COLUMNS TO email_send_logs
-- ============================================

-- Add email_type to categorize emails (template, contact_form, magic_link, direct, etc.)
ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS email_type TEXT;

-- Add bounce tracking columns
ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Add click/open count tracking (for multiple opens/clicks)
ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;

-- Add last opened/clicked timestamps (for most recent event)
ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.email_send_logs
ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 2. UPDATE EXISTING RECORDS
-- ============================================

-- Set email_type for existing template-based emails
UPDATE public.email_send_logs
SET email_type = 'template'
WHERE template_id IS NOT NULL
  AND email_type IS NULL;

-- Set email_type for existing non-template emails (if any)
-- These would have template_id = NULL but template_slug might be set
UPDATE public.email_send_logs
SET email_type = 'direct'
WHERE template_id IS NULL
  AND email_type IS NULL;

-- ============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for filtering by email_type
CREATE INDEX IF NOT EXISTS idx_email_send_logs_email_type 
ON public.email_send_logs(email_type);

-- Index for filtering by bounced_at
CREATE INDEX IF NOT EXISTS idx_email_send_logs_bounced_at 
ON public.email_send_logs(bounced_at) 
WHERE bounced_at IS NOT NULL;

-- Composite index for common admin dashboard queries (type + status + date)
CREATE INDEX IF NOT EXISTS idx_email_send_logs_type_status_sent 
ON public.email_send_logs(email_type, status, sent_at DESC);

-- Composite index for template-based queries
CREATE INDEX IF NOT EXISTS idx_email_send_logs_template_type 
ON public.email_send_logs(template_id, email_type, sent_at DESC)
WHERE template_id IS NOT NULL;

-- Index for recipient searches
CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient_lower 
ON public.email_send_logs(LOWER(recipient));

-- Index for subject searches (using ILIKE for case-insensitive search)
-- Note: For advanced text search with trigrams, enable pg_trgm extension at project level
-- and create index: CREATE INDEX idx_email_send_logs_subject_trgm ON email_send_logs USING gin(subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_subject 
ON public.email_send_logs(subject);

-- ============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.email_send_logs.email_type IS 'Type of email: template, contact_form, magic_link, direct, etc.';
COMMENT ON COLUMN public.email_send_logs.bounced_at IS 'Timestamp when email bounced';
COMMENT ON COLUMN public.email_send_logs.bounce_reason IS 'Reason for bounce if applicable';
COMMENT ON COLUMN public.email_send_logs.click_count IS 'Total number of times email was clicked';
COMMENT ON COLUMN public.email_send_logs.open_count IS 'Total number of times email was opened';
COMMENT ON COLUMN public.email_send_logs.last_opened_at IS 'Most recent open timestamp';
COMMENT ON COLUMN public.email_send_logs.last_clicked_at IS 'Most recent click timestamp';
