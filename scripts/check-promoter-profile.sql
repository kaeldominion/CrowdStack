-- Script to check promoter profile status for a user
-- Usage: Replace 'promoter@crowdstack.app' with the email you want to check

-- 1. Find the user by email
SELECT 
  id as user_id,
  email,
  created_at as user_created_at
FROM auth.users
WHERE email = 'promoter@crowdstack.app';

-- 2. Check if user has promoter role
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at as role_assigned_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'promoter@crowdstack.app'
  AND ur.role = 'promoter';

-- 3. Check if promoter profile exists (by user_id)
SELECT 
  p.id as promoter_id,
  p.user_id,
  p.name,
  p.email,
  p.status,
  p.created_by,
  p.created_at
FROM promoters p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'promoter@crowdstack.app';

-- 4. Check if promoter profile exists (by created_by - legacy)
SELECT 
  p.id as promoter_id,
  p.user_id,
  p.created_by,
  p.name,
  p.email,
  p.status,
  p.created_at
FROM promoters p
JOIN auth.users u ON p.created_by = u.id
WHERE u.email = 'promoter@crowdstack.app';

-- 5. Check if user has any venue associations (via events)
SELECT DISTINCT
  e.venue_id,
  v.name as venue_name,
  ep.promoter_id,
  p.name as promoter_name
FROM event_promoters ep
JOIN events e ON ep.event_id = e.id
JOIN promoters p ON ep.promoter_id = p.id
LEFT JOIN venues v ON e.venue_id = v.id
JOIN auth.users u ON p.user_id = u.id OR p.created_by = u.id
WHERE u.email = 'promoter@crowdstack.app'
  AND v.name ILIKE '%shishi%';

-- 6. Summary query - all in one
SELECT 
  u.id as user_id,
  u.email,
  CASE WHEN ur.role IS NOT NULL THEN 'YES' ELSE 'NO' END as has_promoter_role,
  CASE WHEN p_by_user.id IS NOT NULL THEN 'YES (by user_id)' 
       WHEN p_by_created.id IS NOT NULL THEN 'YES (by created_by)' 
       ELSE 'NO' END as has_promoter_profile,
  p_by_user.id as promoter_id_by_user,
  p_by_created.id as promoter_id_by_created,
  COALESCE(p_by_user.status, p_by_created.status) as promoter_status
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'promoter'
LEFT JOIN promoters p_by_user ON p_by_user.user_id = u.id
LEFT JOIN promoters p_by_created ON p_by_created.created_by = u.id AND p_by_created.user_id IS NULL
WHERE u.email = 'promoter@crowdstack.app';
