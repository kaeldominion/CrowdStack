-- Enhanced features migration
-- Adds promoter access types, invite QR codes, enhanced guest flags, and strike system

-- Add promoter_access_type to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS promoter_access_type TEXT DEFAULT 'public' 
CHECK (promoter_access_type IN ('public', 'invite_only'));

-- Enhance guest_flags table with strike system
ALTER TABLE public.guest_flags 
ADD COLUMN IF NOT EXISTS strike_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ban_type TEXT DEFAULT 'temporary' 
CHECK (ban_type IN ('temporary', 'permanent')),
ADD COLUMN IF NOT EXISTS permanent_ban BOOLEAN DEFAULT false;

-- Create invite_qr_codes table
CREATE TABLE IF NOT EXISTS public.invite_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  creator_role TEXT NOT NULL CHECK (creator_role IN ('venue_admin', 'event_organizer', 'promoter')),
  qr_token TEXT NOT NULL UNIQUE,
  invite_code TEXT NOT NULL UNIQUE, -- Human-readable short code
  max_uses INTEGER, -- NULL = unlimited
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for invite_qr_codes
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_event_id ON public.invite_qr_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_invite_code ON public.invite_qr_codes(invite_code);
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_qr_token ON public.invite_qr_codes(qr_token);
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_created_by ON public.invite_qr_codes(created_by);

-- Create index for guest_flags strikes
CREATE INDEX IF NOT EXISTS idx_guest_flags_strike_count ON public.guest_flags(strike_count);
CREATE INDEX IF NOT EXISTS idx_guest_flags_permanent_ban ON public.guest_flags(permanent_ban);

-- Add comment for documentation
COMMENT ON COLUMN public.events.promoter_access_type IS 'Controls whether promoters can freely see/request to promote (public) or must be invited (invite_only)';
COMMENT ON COLUMN public.guest_flags.strike_count IS 'Number of strikes this attendee has at this venue (3 = auto-banned)';
COMMENT ON COLUMN public.guest_flags.permanent_ban IS 'If true, this is a permanent ban that cannot be auto-expired';

