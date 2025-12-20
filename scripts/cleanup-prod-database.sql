-- Cleanup Production Database
-- Removes all test/seed data while preserving spencertarring@gmail.com user account
-- Run this in Production Supabase SQL Editor

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

  RAISE NOTICE 'Cleaning up database, preserving user: % (ID: %)', user_email, target_user_id;

  -- Delete in dependency order to avoid foreign key violations
  
  -- 1. Event outbox (no dependencies)
  DELETE FROM public.event_outbox;
  RAISE NOTICE 'Deleted event_outbox records';

  -- 2. Photos (depends on photo_albums)
  DELETE FROM public.photos;
  RAISE NOTICE 'Deleted photos';

  -- 3. Photo albums (depends on events)
  DELETE FROM public.photo_albums;
  RAISE NOTICE 'Deleted photo_albums';

  -- 4. Guest flags (depends on attendees and venues)
  DELETE FROM public.guest_flags;
  RAISE NOTICE 'Deleted guest_flags';

  -- 5. XP ledger (depends on attendees and events)
  DELETE FROM public.xp_ledger;
  RAISE NOTICE 'Deleted xp_ledger';

  -- 6. Event answers (depends on registrations and questions)
  DELETE FROM public.event_answers;
  RAISE NOTICE 'Deleted event_answers';

  -- 7. Event questions (depends on events)
  DELETE FROM public.event_questions;
  RAISE NOTICE 'Deleted event_questions';

  -- 8. Checkins (depends on registrations)
  DELETE FROM public.checkins;
  RAISE NOTICE 'Deleted checkins';

  -- 9. Registrations (depends on attendees and events)
  DELETE FROM public.registrations;
  RAISE NOTICE 'Deleted registrations';

  -- 10. Event promoters (depends on events and promoters)
  DELETE FROM public.event_promoters;
  RAISE NOTICE 'Deleted event_promoters';

  -- 11. Events (depends on venues and organizers)
  -- Delete events NOT created by the target user
  DELETE FROM public.events
  WHERE organizer_id IN (
    SELECT id FROM public.organizers WHERE created_by != target_user_id
  );
  -- Also delete events where organizer is null or doesn't exist
  DELETE FROM public.events
  WHERE organizer_id NOT IN (SELECT id FROM public.organizers);
  RAISE NOTICE 'Deleted events (preserving user-created events if any)';

  -- 12. Attendees (keep only those linked to target user)
  DELETE FROM public.attendees
  WHERE user_id IS NULL OR user_id != target_user_id;
  RAISE NOTICE 'Deleted attendees (preserving user-linked attendees)';

  -- 13. Promoters (keep only those created by target user)
  DELETE FROM public.promoters
  WHERE created_by IS NULL OR created_by != target_user_id;
  RAISE NOTICE 'Deleted promoters (preserving user-created promoters)';

  -- 14. Organizers (keep only those created by target user)
  DELETE FROM public.organizers
  WHERE created_by IS NULL OR created_by != target_user_id;
  RAISE NOTICE 'Deleted organizers (preserving user-created organizers)';

  -- 15. Venues (keep only those created by target user)
  DELETE FROM public.venues
  WHERE created_by IS NULL OR created_by != target_user_id;
  RAISE NOTICE 'Deleted venues (preserving user-created venues)';

  -- 16. Invite tokens (keep only those created by target user)
  DELETE FROM public.invite_tokens
  WHERE created_by IS NULL OR created_by != target_user_id;
  RAISE NOTICE 'Deleted invite_tokens (preserving user-created invites)';

  -- 17. User roles (keep only target user's roles)
  DELETE FROM public.user_roles
  WHERE user_id != target_user_id;
  RAISE NOTICE 'Deleted user_roles (preserving target user roles)';

  -- Summary
  RAISE NOTICE '✅ Cleanup complete!';
  RAISE NOTICE 'Preserved user: % (ID: %)', user_email, target_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining data:';
  RAISE NOTICE '  - User account: %', (SELECT COUNT(*) FROM auth.users WHERE id = target_user_id);
  RAISE NOTICE '  - User roles: %', (SELECT COUNT(*) FROM public.user_roles WHERE user_id = target_user_id);
  RAISE NOTICE '  - Venues: %', (SELECT COUNT(*) FROM public.venues WHERE created_by = target_user_id);
  RAISE NOTICE '  - Organizers: %', (SELECT COUNT(*) FROM public.organizers WHERE created_by = target_user_id);
  RAISE NOTICE '  - Promoters: %', (SELECT COUNT(*) FROM public.promoters WHERE created_by = target_user_id);
  RAISE NOTICE '  - Attendees: %', (SELECT COUNT(*) FROM public.attendees WHERE user_id = target_user_id);
  RAISE NOTICE '  - Events: %', (SELECT COUNT(*) FROM public.events WHERE organizer_id IN (SELECT id FROM public.organizers WHERE created_by = target_user_id)));

END $$;

