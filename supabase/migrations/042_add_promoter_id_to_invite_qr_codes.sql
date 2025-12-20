-- Add promoter_id column to invite_qr_codes table
-- This allows organizers/venues to create invite codes specifically for promoters

ALTER TABLE public.invite_qr_codes
ADD COLUMN IF NOT EXISTS promoter_id UUID REFERENCES public.promoters(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.invite_qr_codes.promoter_id IS 'Optional: specific promoter this invite code is for (when organizer/venue creates code for a promoter)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_qr_codes_promoter_id ON public.invite_qr_codes(promoter_id);

