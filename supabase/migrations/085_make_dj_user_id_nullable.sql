-- Make DJ user_id nullable to allow DJ profiles without user accounts
-- This allows admins to create DJ profiles for DJs who haven't signed up yet

-- First, find and drop any UNIQUE constraint on user_id
DO $$
DECLARE
  constraint_name TEXT;
  user_id_attnum SMALLINT;
BEGIN
  -- Get the attribute number for user_id
  SELECT attnum INTO user_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.djs'::regclass
    AND attname = 'user_id';
  
  -- Find the unique constraint name for user_id
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.djs'::regclass
    AND contype = 'u'
    AND conkey @> ARRAY[user_id_attnum];
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.djs DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Drop the NOT NULL constraint on user_id
ALTER TABLE public.djs 
  ALTER COLUMN user_id DROP NOT NULL;

-- Create a partial unique index for user_id (only applies when user_id is not null)
-- This ensures one DJ profile per user, but allows multiple unassigned DJ profiles
DROP INDEX IF EXISTS idx_djs_user_id_unique;
CREATE UNIQUE INDEX idx_djs_user_id_unique 
  ON public.djs(user_id) 
  WHERE user_id IS NOT NULL;

-- Update RLS policies to handle NULL user_id
-- The "DJs can edit own profile" policy already uses auth.uid() = user_id, 
-- which will naturally exclude NULL user_id rows (since auth.uid() can't match NULL)
-- So the existing policies should work fine - only superadmins can manage unassigned DJs

COMMENT ON COLUMN public.djs.user_id IS 'User ID linked to this DJ profile. NULL if the DJ profile exists without a user account yet.';

