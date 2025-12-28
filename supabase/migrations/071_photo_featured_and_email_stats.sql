-- Photo Featured Photos and Email Stats Migration
-- Adds featured photo support and email delivery tracking

-- ============================================================================
-- 1. Featured Photos
-- ============================================================================

-- Add featured flag and order to photos table
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Index for featured photos queries
CREATE INDEX IF NOT EXISTS idx_photos_featured ON public.photos(album_id, is_featured, featured_order) 
WHERE is_featured = true;

COMMENT ON COLUMN public.photos.is_featured IS 'If true, photo appears at top of gallery as featured';
COMMENT ON COLUMN public.photos.featured_order IS 'Display order for featured photos (lower numbers appear first)';

-- ============================================================================
-- 2. Email Delivery Stats
-- ============================================================================

-- Check if message_logs table exists and has email tracking columns
DO $$
BEGIN
  -- Add email tracking columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'message_logs' 
    AND column_name = 'email_delivered_at'
  ) THEN
    ALTER TABLE public.message_logs
    ADD COLUMN email_delivered_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN email_opened_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN email_clicked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN email_bounced_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN email_bounce_reason TEXT,
    ADD COLUMN email_recipient_email TEXT,
    ADD COLUMN email_subject TEXT,
    ADD COLUMN email_message_type TEXT, -- 'photo_notification', 'event_invite', etc.
    ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update status constraint to include new statuses
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_logs_status_check' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.message_logs DROP CONSTRAINT message_logs_status_check;
  END IF;
  
  -- Add new constraint with additional statuses
  ALTER TABLE public.message_logs
  ADD CONSTRAINT message_logs_status_check 
  CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced', 'spam_complaint'));
END $$;

-- Indexes for email stats queries
CREATE INDEX IF NOT EXISTS idx_message_logs_email_type ON public.message_logs(email_message_type) 
WHERE email_message_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_logs_email_recipient ON public.message_logs(email_recipient_email) 
WHERE email_recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_logs_email_delivered ON public.message_logs(email_delivered_at) 
WHERE email_delivered_at IS NOT NULL;

COMMENT ON COLUMN public.message_logs.email_delivered_at IS 'When email was successfully delivered';
COMMENT ON COLUMN public.message_logs.email_opened_at IS 'When recipient opened the email';
COMMENT ON COLUMN public.message_logs.email_clicked_at IS 'When recipient clicked a link in the email';
COMMENT ON COLUMN public.message_logs.email_bounced_at IS 'When email bounced';
COMMENT ON COLUMN public.message_logs.email_bounce_reason IS 'Reason for bounce if applicable';
COMMENT ON COLUMN public.message_logs.email_recipient_email IS 'Email address of recipient';
COMMENT ON COLUMN public.message_logs.email_subject IS 'Email subject line';
COMMENT ON COLUMN public.message_logs.email_message_type IS 'Type of email message (photo_notification, event_invite, etc.)';

