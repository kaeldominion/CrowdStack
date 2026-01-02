-- Add superadmin access to promoter payout templates
-- Superadmins should be able to view and manage all templates

-- Superadmins can read all templates
CREATE POLICY "Superadmins can read all payout templates"
  ON public.promoter_payout_templates FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

-- Superadmins can insert templates for any organizer
CREATE POLICY "Superadmins can insert payout templates"
  ON public.promoter_payout_templates FOR INSERT
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Superadmins can update all templates
CREATE POLICY "Superadmins can update all payout templates"
  ON public.promoter_payout_templates FOR UPDATE
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Superadmins can delete all templates
CREATE POLICY "Superadmins can delete all payout templates"
  ON public.promoter_payout_templates FOR DELETE
  USING (public.user_is_superadmin(auth.uid()));

COMMENT ON POLICY "Superadmins can read all payout templates" ON public.promoter_payout_templates IS 'Allows superadmins to view all payout templates across all organizers';
COMMENT ON POLICY "Superadmins can insert payout templates" ON public.promoter_payout_templates IS 'Allows superadmins to create templates for any organizer';
COMMENT ON POLICY "Superadmins can update all payout templates" ON public.promoter_payout_templates IS 'Allows superadmins to modify any template';
COMMENT ON POLICY "Superadmins can delete all payout templates" ON public.promoter_payout_templates IS 'Allows superadmins to delete any template';

