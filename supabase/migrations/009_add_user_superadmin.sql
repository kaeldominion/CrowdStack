-- Add superadmin role to specific user
-- This migration assigns superadmin role to spencertarring@gmail.com

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'spencertarring@gmail.com'
  LIMIT 1;

  -- If user found, assign superadmin role
  IF target_user_id IS NOT NULL THEN
    -- Insert superadmin role if it doesn't exist
    INSERT INTO public.user_roles (user_id, role, metadata)
    VALUES (target_user_id, 'superadmin'::user_role, '{}'::jsonb)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Superadmin role assigned to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email spencertarring@gmail.com not found';
  END IF;
END $$;

