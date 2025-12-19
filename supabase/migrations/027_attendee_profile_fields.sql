-- Attendee Profile Fields
-- Add extended profile fields for attendees: avatar, bio, social links, DOB, surname
-- Preparing for WhatsApp-first platform

-- Add profile fields to attendees table
ALTER TABLE public.attendees
ADD COLUMN IF NOT EXISTS surname TEXT,
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Index for social handles (may want to search by these)
CREATE INDEX IF NOT EXISTS idx_attendees_instagram ON public.attendees(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendees_tiktok ON public.attendees(tiktok_handle) WHERE tiktok_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendees_whatsapp ON public.attendees(whatsapp) WHERE whatsapp IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.attendees.surname IS 'Last name/surname of the attendee';
COMMENT ON COLUMN public.attendees.date_of_birth IS 'Date of birth for age verification and personalization';
COMMENT ON COLUMN public.attendees.avatar_url IS 'Profile picture URL (Supabase Storage or external)';
COMMENT ON COLUMN public.attendees.bio IS 'Personal bio/description';
COMMENT ON COLUMN public.attendees.instagram_handle IS 'Instagram username (without @)';
COMMENT ON COLUMN public.attendees.tiktok_handle IS 'TikTok username (without @)';
COMMENT ON COLUMN public.attendees.whatsapp IS 'WhatsApp phone number (format: +1234567890). Preparing for WhatsApp-first platform.';

-- Update attendees.updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendees_updated_at ON public.attendees;
CREATE TRIGGER trigger_update_attendees_updated_at
  BEFORE UPDATE ON public.attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_attendees_updated_at();

