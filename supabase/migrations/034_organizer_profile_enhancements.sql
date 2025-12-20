-- Organizer Profile Enhancements
-- Adds profile fields, team members, and event flier support

-- Add profile fields to organizers table
ALTER TABLE public.organizers 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Create organizer_team_members table
CREATE TABLE IF NOT EXISTS public.organizer_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  avatar_url TEXT,
  email TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add flier_url to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS flier_url TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizer_team_members_organizer_id 
  ON public.organizer_team_members(organizer_id);

CREATE INDEX IF NOT EXISTS idx_organizer_team_members_display_order 
  ON public.organizer_team_members(organizer_id, display_order);

-- RLS Policies for organizer_team_members
ALTER TABLE public.organizer_team_members ENABLE ROW LEVEL SECURITY;

-- Organizers can read their own team members
CREATE POLICY "Organizers can read their team members"
  ON public.organizer_team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_team_members.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Organizers can insert their own team members
CREATE POLICY "Organizers can insert their team members"
  ON public.organizer_team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_team_members.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Organizers can update their own team members
CREATE POLICY "Organizers can update their team members"
  ON public.organizer_team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_team_members.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Organizers can delete their own team members
CREATE POLICY "Organizers can delete their team members"
  ON public.organizer_team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_team_members.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Public can read team members for published events (for public organizer pages)
CREATE POLICY "Public can read team members for published organizers"
  ON public.organizer_team_members FOR SELECT
  USING (true); -- Allow public read for now, can be restricted later if needed

COMMENT ON COLUMN public.organizers.logo_url IS 'Organizer logo/avatar image URL';
COMMENT ON COLUMN public.organizers.bio IS 'Organizer bio/description';
COMMENT ON COLUMN public.organizers.website IS 'Organizer website URL';
COMMENT ON COLUMN public.organizers.instagram_url IS 'Instagram handle or URL';
COMMENT ON COLUMN public.organizers.twitter_url IS 'Twitter/X handle or URL';
COMMENT ON COLUMN public.organizers.facebook_url IS 'Facebook page URL';
COMMENT ON COLUMN public.events.flier_url IS 'Digital flier/poster image URL for the event';

