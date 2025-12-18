-- Verify seed data exists and fix if needed
-- This migration checks if seed data exists and provides diagnostics

DO $$
DECLARE
  venue_count INT;
  organizer_count INT;
  promoter_count INT;
  attendee_count INT;
  event_count INT;
  registration_count INT;
  first_user_id UUID;
BEGIN
  -- Get first user for seed data
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  -- Count existing data
  SELECT COUNT(*) INTO venue_count FROM public.venues;
  SELECT COUNT(*) INTO organizer_count FROM public.organizers;
  SELECT COUNT(*) INTO promoter_count FROM public.promoters;
  SELECT COUNT(*) INTO attendee_count FROM public.attendees;
  SELECT COUNT(*) INTO event_count FROM public.events;
  SELECT COUNT(*) INTO registration_count FROM public.registrations;
  
  RAISE NOTICE 'Current data counts:';
  RAISE NOTICE '  Venues: %', venue_count;
  RAISE NOTICE '  Organizers: %', organizer_count;
  RAISE NOTICE '  Promoters: %', promoter_count;
  RAISE NOTICE '  Attendees: %', attendee_count;
  RAISE NOTICE '  Events: %', event_count;
  RAISE NOTICE '  Registrations: %', registration_count;
  
  -- If no venues exist, seed data might not have run
  IF venue_count = 0 AND first_user_id IS NOT NULL THEN
    RAISE NOTICE 'No venues found. You may need to run migration 007_staging_seed_data.sql';
  END IF;
  
  -- If user not found, warn
  IF first_user_id IS NULL THEN
    RAISE WARNING 'No users found in auth.users. Seed data requires at least one user to exist.';
  END IF;
END $$;

-- Create a view to help debug data issues
CREATE OR REPLACE VIEW public.data_summary AS
SELECT 
  (SELECT COUNT(*) FROM public.venues) as venues,
  (SELECT COUNT(*) FROM public.organizers) as organizers,
  (SELECT COUNT(*) FROM public.promoters) as promoters,
  (SELECT COUNT(*) FROM public.attendees) as attendees,
  (SELECT COUNT(*) FROM public.events) as events,
  (SELECT COUNT(*) FROM public.registrations) as registrations,
  (SELECT COUNT(*) FROM public.checkins) as checkins,
  (SELECT COUNT(*) FROM auth.users) as auth_users;

