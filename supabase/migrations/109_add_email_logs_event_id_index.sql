-- Add index for querying email_send_logs by event_id in metadata
-- This improves performance for the Email Stats page
-- ============================================

-- Create GIN index on metadata for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_email_send_logs_metadata_gin 
ON public.email_send_logs USING gin(metadata);

-- Create specific index for event_id lookups (if GIN doesn't cover it well enough)
-- Note: This uses a functional index for the specific query pattern
CREATE INDEX IF NOT EXISTS idx_email_send_logs_event_id 
ON public.email_send_logs((metadata->>'event_id'))
WHERE metadata->>'event_id' IS NOT NULL;

COMMENT ON INDEX idx_email_send_logs_metadata_gin IS 'GIN index for efficient JSONB metadata queries';
COMMENT ON INDEX idx_email_send_logs_event_id IS 'Index for querying email logs by event_id in metadata';

