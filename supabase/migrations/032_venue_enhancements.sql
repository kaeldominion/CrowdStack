-- Venue Enhancements
-- Adds fields for branding, location, gallery, tags, and policies

-- Add enhancement fields to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS age_restriction TEXT,
ADD COLUMN IF NOT EXISTS entry_notes TEXT,
ADD COLUMN IF NOT EXISTS table_min_spend_notes TEXT,
ADD COLUMN IF NOT EXISTS default_registration_questions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS default_commission_rules JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS default_message_templates JSONB DEFAULT '{}'::jsonb;

-- Create venue_gallery table
CREATE TABLE IF NOT EXISTS public.venue_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  is_hero BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venue_tags table
CREATE TABLE IF NOT EXISTS public.venue_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  tag_type TEXT NOT NULL, -- 'music', 'dress_code', 'crowd_type', 'price_range'
  tag_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, tag_type, tag_value)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_venues_slug ON public.venues(slug);
CREATE INDEX IF NOT EXISTS idx_venue_gallery_venue_id ON public.venue_gallery(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_gallery_hero ON public.venue_gallery(venue_id, is_hero) WHERE is_hero = TRUE;
CREATE INDEX IF NOT EXISTS idx_venue_tags_venue_id ON public.venue_tags(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_tags_type ON public.venue_tags(venue_id, tag_type);

-- ============================================
-- RLS POLICIES FOR VENUE ENHANCEMENTS
-- ============================================

-- Public can read venues (for public profile pages)
CREATE POLICY "Public can read venues"
  ON public.venues FOR SELECT
  USING (true);

-- Venue admins can manage their venue data (already exists, but ensure it covers new fields)
-- The existing policy "Venue admins can manage their venue" should cover all fields

-- Public can read venue gallery images
CREATE POLICY "Public can read venue gallery"
  ON public.venue_gallery FOR SELECT
  USING (true);

-- Venue admins can manage their venue gallery
CREATE POLICY "Venue admins can manage their venue gallery"
  ON public.venue_gallery FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_gallery.venue_id
      AND venues.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_gallery.venue_id
      AND venues.created_by = auth.uid()
    )
  );

-- Public can read venue tags
CREATE POLICY "Public can read venue tags"
  ON public.venue_tags FOR SELECT
  USING (true);

-- Venue admins can manage their venue tags
CREATE POLICY "Venue admins can manage their venue tags"
  ON public.venue_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_tags.venue_id
      AND venues.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = venue_tags.venue_id
      AND venues.created_by = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN public.venues.slug IS 'URL-friendly identifier for public venue pages';
COMMENT ON COLUMN public.venues.accent_color IS 'Hex color code for venue branding (e.g., "#3B82F6")';
COMMENT ON COLUMN public.venues.default_registration_questions IS 'Default questions to pre-populate for new events at this venue';
COMMENT ON COLUMN public.venues.default_commission_rules IS 'Default commission structure for events at this venue';
COMMENT ON COLUMN public.venues.default_message_templates IS 'Default message templates with placeholders for events at this venue';
COMMENT ON TABLE public.venue_gallery IS 'Gallery images for venues';
COMMENT ON TABLE public.venue_tags IS 'Tags for venue categorization (music, dress code, crowd type, price range)';

