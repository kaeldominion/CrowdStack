-- ============================================
-- PROMOTER RANKING FUNCTION
-- ============================================
-- This function efficiently calculates a promoter's rank based on referral count
-- using database aggregation instead of fetching all registrations to the app

-- Function to count how many promoters have more referrals than the target
CREATE OR REPLACE FUNCTION public.count_promoters_ahead(target_promoter_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH promoter_counts AS (
    SELECT
      referral_promoter_id,
      COUNT(*) as referral_count
    FROM registrations
    WHERE referral_promoter_id IS NOT NULL
    GROUP BY referral_promoter_id
  ),
  target_count AS (
    SELECT COALESCE(
      (SELECT referral_count FROM promoter_counts WHERE referral_promoter_id = target_promoter_id),
      0
    ) as my_count
  )
  SELECT COUNT(*)::INTEGER
  FROM promoter_counts, target_count
  WHERE promoter_counts.referral_count > target_count.my_count;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.count_promoters_ahead(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_promoters_ahead(UUID) TO service_role;

-- Add index to speed up the aggregation query
CREATE INDEX IF NOT EXISTS idx_registrations_referral_promoter_count
  ON public.registrations(referral_promoter_id)
  WHERE referral_promoter_id IS NOT NULL;

COMMENT ON FUNCTION public.count_promoters_ahead IS
  'Efficiently calculates how many promoters have more referrals than the target promoter. Used for ranking without fetching all registrations.';
