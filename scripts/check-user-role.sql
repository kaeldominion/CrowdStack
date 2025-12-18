-- Quick script to check if spencertarring@gmail.com has superadmin role
-- Run this in Supabase SQL Editor

SELECT 
  u.email,
  u.id as user_id,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'spencertarring@gmail.com';

-- If no results, the user doesn't exist yet
-- If results but no superadmin role, run the make-superadmin.sql script

