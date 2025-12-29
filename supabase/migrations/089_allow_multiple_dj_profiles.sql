-- Allow users to have multiple DJ profiles
-- This removes the unique constraint on user_id to enable multi-profile support

-- Drop the partial unique index that enforced one DJ per user
DROP INDEX IF EXISTS idx_djs_user_id_unique;

-- Keep the regular index for performance (non-unique)
-- The idx_djs_user_id index should already exist from migration 079

-- Update the comment
COMMENT ON COLUMN public.djs.user_id IS 'User ID linked to this DJ profile. Users can have multiple DJ profiles. NULL if the DJ profile exists without a user account.';
COMMENT ON TABLE public.djs IS 'DJ profiles - users can have multiple DJ profiles';

