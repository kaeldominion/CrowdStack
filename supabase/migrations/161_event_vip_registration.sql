-- Migration: Add event-specific VIP fields to registrations
-- This allows promoters to mark specific registrations as VIP for their event

-- Add event VIP fields to registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS is_event_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS event_vip_reason TEXT,
ADD COLUMN IF NOT EXISTS event_vip_marked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS event_vip_marked_at TIMESTAMPTZ;

-- Create index for efficient VIP lookups
CREATE INDEX IF NOT EXISTS idx_registrations_event_vip
ON registrations(event_id, is_event_vip)
WHERE is_event_vip = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN registrations.is_event_vip IS 'Whether this registration is marked as VIP for this specific event';
COMMENT ON COLUMN registrations.event_vip_reason IS 'Reason for VIP designation (e.g., "Sponsor", "Press", "Special Guest")';
COMMENT ON COLUMN registrations.event_vip_marked_by IS 'User ID of who marked this registration as VIP';
COMMENT ON COLUMN registrations.event_vip_marked_at IS 'Timestamp when VIP status was marked';
