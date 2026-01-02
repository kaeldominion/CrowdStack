-- Migration: Add search_users_by_email RPC function for scalable user search
-- This function searches auth.users by email with O(log n) performance using the email index
-- Required for promoter search to scale beyond 1000 users

CREATE OR REPLACE FUNCTION public.search_users_by_email(search_term TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow service role to call this function
  -- The SECURITY DEFINER + search_path ensures we can query auth schema
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.email ILIKE search_term
  ORDER BY u.email
  LIMIT 50;
END;
$$;

-- Grant execute permission to service role only
-- This function should only be called from server-side code
REVOKE ALL ON FUNCTION public.search_users_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_users_by_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.search_users_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.search_users_by_email IS 
'Searches auth.users by email pattern. Uses the email index for O(log n) performance.
Only callable by service_role for security. Used by promoter search API.';

