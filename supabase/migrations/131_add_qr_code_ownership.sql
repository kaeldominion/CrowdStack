-- Add ownership fields to dynamic_qr_codes for organizer/venue access
-- This allows organizers and venues to manage their own QR codes

-- ============================================
-- ADD OWNERSHIP FIELDS
-- ============================================

ALTER TABLE public.dynamic_qr_codes
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_venue_id ON public.dynamic_qr_codes(venue_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_organizer_id ON public.dynamic_qr_codes(organizer_id);

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Drop existing superadmin-only policy
DROP POLICY IF EXISTS "Superadmins can manage QR codes" ON public.dynamic_qr_codes;

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage QR codes"
  ON public.dynamic_qr_codes FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Venue admins can manage QR codes for their venues
CREATE POLICY "Venue admins can manage their QR codes"
  ON public.dynamic_qr_codes FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND (
      venue_id IN (
        -- Check venue_users table
        SELECT vu.venue_id
        FROM public.venue_users vu
        WHERE vu.user_id = auth.uid()
        UNION
        -- Check created_by (backward compatibility)
        SELECT v.id
        FROM public.venues v
        WHERE v.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'venue_admin'::user_role)
    AND (
      venue_id IN (
        SELECT vu.venue_id
        FROM public.venue_users vu
        WHERE vu.user_id = auth.uid()
        UNION
        SELECT v.id
        FROM public.venues v
        WHERE v.created_by = auth.uid()
      )
    )
  );

-- Organizers can manage QR codes for their organizers
CREATE POLICY "Organizers can manage their QR codes"
  ON public.dynamic_qr_codes FOR ALL
  USING (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND (
      organizer_id IN (
        -- Check organizer_users table
        SELECT ou.organizer_id
        FROM public.organizer_users ou
        WHERE ou.user_id = auth.uid()
        UNION
        -- Check created_by (backward compatibility)
        SELECT o.id
        FROM public.organizers o
        WHERE o.created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.user_has_role(auth.uid(), 'event_organizer'::user_role)
    AND (
      organizer_id IN (
        SELECT ou.organizer_id
        FROM public.organizer_users ou
        WHERE ou.user_id = auth.uid()
        UNION
        SELECT o.id
        FROM public.organizers o
        WHERE o.created_by = auth.uid()
      )
    )
  );

