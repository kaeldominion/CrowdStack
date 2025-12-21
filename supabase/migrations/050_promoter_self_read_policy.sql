-- Allow promoters to read their own record
-- This is needed for the PromoterRequestButton component on public event pages
-- to check if the current user is a promoter

-- First, add policy for users to read their own promoter record
CREATE POLICY "Users can read their own promoter record"
  ON public.promoters FOR SELECT
  USING (created_by = auth.uid());

-- Also allow promoters with the 'promoter' role to read their own record
-- (in case created_by is null but they have the role)
CREATE POLICY "Promoters can read their own record via role"
  ON public.promoters FOR SELECT
  USING (
    public.user_has_role(auth.uid(), 'promoter'::user_role)
    AND id = public.get_user_promoter_id(auth.uid())
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can read their own promoter record" ON public.promoters IS 
  'Allows users to check if they are a promoter by querying their own record';

