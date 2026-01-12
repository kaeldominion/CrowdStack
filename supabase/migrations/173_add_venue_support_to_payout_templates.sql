-- Add venue support to promoter payout templates
-- Venues can now create and manage their own payout templates
-- ============================================

-- Make organizer_id nullable (since templates can now belong to venues)
ALTER TABLE public.promoter_payout_templates
  ALTER COLUMN organizer_id DROP NOT NULL;

-- Add venue_id column (nullable, so templates can belong to either organizer or venue)
ALTER TABLE public.promoter_payout_templates
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE;

-- Add constraint to ensure template belongs to either organizer or venue (but not both)
ALTER TABLE public.promoter_payout_templates
  DROP CONSTRAINT IF EXISTS promoter_payout_templates_owner_check;
  
ALTER TABLE public.promoter_payout_templates
  ADD CONSTRAINT promoter_payout_templates_owner_check
  CHECK (
    (organizer_id IS NOT NULL AND venue_id IS NULL) OR
    (organizer_id IS NULL AND venue_id IS NOT NULL)
  );

-- Update the unique index for default templates to work with venues
DROP INDEX IF EXISTS idx_promoter_payout_templates_one_default_per_organizer;

-- Create separate unique indexes for organizer and venue defaults
CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_payout_templates_one_default_per_organizer
  ON public.promoter_payout_templates(organizer_id)
  WHERE is_default = true AND organizer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_payout_templates_one_default_per_venue
  ON public.promoter_payout_templates(venue_id)
  WHERE is_default = true AND venue_id IS NOT NULL;

-- Update the trigger function to handle both organizers and venues
CREATE OR REPLACE FUNCTION ensure_one_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If this template is being set as default, unset all other defaults for this owner
  IF NEW.is_default = true THEN
    IF NEW.organizer_id IS NOT NULL THEN
      UPDATE public.promoter_payout_templates
      SET is_default = false
      WHERE organizer_id = NEW.organizer_id
        AND id != NEW.id
        AND is_default = true;
    ELSIF NEW.venue_id IS NOT NULL THEN
      UPDATE public.promoter_payout_templates
      SET is_default = false
      WHERE venue_id = NEW.venue_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON COLUMN public.promoter_payout_templates.venue_id IS 'Venue who owns this template (mutually exclusive with organizer_id)';

-- ============================================
-- UPDATE RLS POLICIES FOR VENUES
-- ============================================

-- Venues can read their own templates
CREATE POLICY "Venues can read their own payout templates"
  ON public.promoter_payout_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_payout_templates.venue_id
      AND (
        v.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = v.id
          AND vu.user_id = auth.uid()
        )
      )
    )
  );

-- Venues can insert their own templates
CREATE POLICY "Venues can insert their own payout templates"
  ON public.promoter_payout_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_payout_templates.venue_id
      AND (
        v.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = v.id
          AND vu.user_id = auth.uid()
        )
      )
    )
  );

-- Venues can update their own templates
CREATE POLICY "Venues can update their own payout templates"
  ON public.promoter_payout_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_payout_templates.venue_id
      AND (
        v.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = v.id
          AND vu.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_payout_templates.venue_id
      AND (
        v.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = v.id
          AND vu.user_id = auth.uid()
        )
      )
    )
  );

-- Venues can delete their own templates
CREATE POLICY "Venues can delete their own payout templates"
  ON public.promoter_payout_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_payout_templates.venue_id
      AND (
        v.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = v.id
          AND vu.user_id = auth.uid()
        )
      )
    )
  );

COMMENT ON POLICY "Venues can read their own payout templates" ON public.promoter_payout_templates IS 
  'Allows venue admins to view their own payout templates';
COMMENT ON POLICY "Venues can insert their own payout templates" ON public.promoter_payout_templates IS 
  'Allows venue admins to create payout templates for their venue';
COMMENT ON POLICY "Venues can update their own payout templates" ON public.promoter_payout_templates IS 
  'Allows venue admins to modify their own payout templates';
COMMENT ON POLICY "Venues can delete their own payout templates" ON public.promoter_payout_templates IS 
  'Allows venue admins to delete their own payout templates';
