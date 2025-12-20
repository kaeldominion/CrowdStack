-- Add self_promote column to invite_qr_codes table
-- This allows organizers to create QR codes for self-promotion that link directly to registration

ALTER TABLE public.invite_qr_codes
ADD COLUMN IF NOT EXISTS self_promote BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.invite_qr_codes.self_promote IS 'If true, this is a self-promote QR code for the organizer that links directly to registration';

-- Create index for faster lookups (optional, but can be useful)
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_self_promote ON public.invite_qr_codes(self_promote) WHERE self_promote = true;

