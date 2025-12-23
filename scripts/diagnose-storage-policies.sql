-- Diagnostic query to check storage policies and user status
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check what policies exist for event-photos bucket
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (
    policyname LIKE '%video%' 
    OR policyname LIKE '%event-photos%'
    OR policyname LIKE '%event photos%'
)
ORDER BY policyname;

-- 2. Check if the current user has an organizer record
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users
SELECT 
    u.id as user_id,
    u.email,
    o.id as organizer_id,
    o.created_by,
    CASE 
        WHEN o.id IS NOT NULL THEN 'Has organizer record'
        ELSE 'NO organizer record'
    END as status
FROM auth.users u
LEFT JOIN public.organizers o ON o.created_by = u.id
WHERE u.email = 'organizer@crowdstack.app'  -- Replace with your email
LIMIT 1;

-- 3. Check if user has superadmin role
SELECT 
    u.id as user_id,
    u.email,
    ur.role,
    CASE 
        WHEN ur.role = 'superadmin' THEN 'Is superadmin'
        ELSE 'Not superadmin'
    END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'superadmin'
WHERE u.email = 'organizer@crowdstack.app'  -- Replace with your email
LIMIT 1;

-- 4. Test the policy condition manually (replace with actual values)
-- This simulates what the policy checks
SELECT 
    'events/c7e58195-2e65-4cb2-8be1-846e6e6540c8/video-flier/test.mp4' LIKE 'events/%/video-flier/%' as path_matches,
    EXISTS (
        SELECT 1 FROM public.organizers o
        WHERE o.created_by = (SELECT id FROM auth.users WHERE email = 'organizer@crowdstack.app' LIMIT 1)
    ) as has_organizer,
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = (SELECT id FROM auth.users WHERE email = 'organizer@crowdstack.app' LIMIT 1)
        AND ur.role = 'superadmin'
    ) as is_superadmin;

