-- Script to make spencertarring@gmail.com a superadmin
-- Run this in your Supabase SQL editor or via psql

-- First, find the user by email
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'spencertarring@gmail.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email spencertarring@gmail.com not found. Please ensure the user has signed up first.';
  END IF;

  -- Assign superadmin role
  INSERT INTO public.user_roles (user_id, role, metadata)
  VALUES (target_user_id, 'superadmin'::user_role, '{"created_by": "system", "note": "Platform superadmin"}'::jsonb)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

  RAISE NOTICE 'Successfully assigned superadmin role to spencertarring@gmail.com (user_id: %)', target_user_id;
END $$;

