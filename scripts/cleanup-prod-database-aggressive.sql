-- Aggressive Cleanup: Remove ALL data except user account
-- This version deletes EVERYTHING, including data created by the user
-- Only preserves the auth.users entry and user_roles for spencertarring@gmail.com
-- Use this if you want a completely clean database

DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'spencertarring@gmail.com';
BEGIN
  -- Get the user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please ensure the user exists first.', user_email;
  END IF;

  RAISE NOTICE '⚠️  AGGRESSIVE CLEANUP: Removing ALL data except user account';
  RAISE NOTICE 'Preserving user: % (ID: %)', user_email, target_user_id;

  -- Delete in dependency order
  
  DELETE FROM public.event_outbox;
  DELETE FROM public.photos;
  DELETE FROM public.photo_albums;
  DELETE FROM public.guest_flags;
  DELETE FROM public.xp_ledger;
  DELETE FROM public.event_answers;
  DELETE FROM public.event_questions;
  DELETE FROM public.checkins;
  DELETE FROM public.registrations;
  DELETE FROM public.event_promoters;
  DELETE FROM public.events;
  DELETE FROM public.attendees;
  DELETE FROM public.promoters;
  DELETE FROM public.organizers;
  DELETE FROM public.venues;
  DELETE FROM public.invite_tokens;
  
  -- Only keep target user's roles
  DELETE FROM public.user_roles
  WHERE user_id != target_user_id;

  RAISE NOTICE '✅ Aggressive cleanup complete!';
  RAISE NOTICE 'Preserved:';
  RAISE NOTICE '  - User account: %', (SELECT COUNT(*) FROM auth.users WHERE id = target_user_id);
  RAISE NOTICE '  - User roles: %', (SELECT COUNT(*) FROM public.user_roles WHERE user_id = target_user_id);
  RAISE NOTICE '';
  RAISE NOTICE 'All other data has been deleted.';

END $$;

