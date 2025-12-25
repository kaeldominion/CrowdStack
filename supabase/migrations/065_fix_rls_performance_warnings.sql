-- Fix RLS Performance Warnings
-- Addresses auth_rls_initplan and multiple_permissive_policies warnings
-- 1. Wrap auth.uid() and auth functions with (select ...) to prevent re-evaluation
-- 2. Consolidate multiple permissive policies for the same role and action

-- ============================================
-- 1. FIX auth_rls_initplan WARNINGS
-- ============================================
-- Replace auth.uid() with (select auth.uid()) in all RLS policies
-- Replace auth.<function>() with (select auth.<function>()) in all RLS policies

-- ============================================
-- XP LEDGER POLICIES
-- ============================================

-- Drop and recreate with optimized auth calls
-- Check if user_id column exists (from migration 044) or if we need to use attendee_id
DO $$
BEGIN
  -- Check if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_ledger' 
    AND column_name = 'user_id'
  ) THEN
    -- user_id column exists (unified XP system)
    DROP POLICY IF EXISTS "Users can read own XP" ON public.xp_ledger;
    DROP POLICY IF EXISTS "Event access users can read XP for events" ON public.xp_ledger;
    
    CREATE POLICY "Users can read own XP"
      ON public.xp_ledger FOR SELECT
      USING (user_id = (select auth.uid()));

    CREATE POLICY "Event access users can read XP for events"
      ON public.xp_ledger FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = xp_ledger.event_id
          AND (
            -- Organizer
            (public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
             AND e.organizer_id = public.get_user_organizer_id((select auth.uid())))
            -- Venue admin
            OR (public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
                AND e.venue_id = public.get_user_venue_id((select auth.uid())))
            -- Promoter
            OR (public.user_has_role((select auth.uid()), 'promoter'::user_role)
                AND EXISTS (
                  SELECT 1 FROM public.event_promoters ep
                  WHERE ep.event_id = e.id
                  AND ep.promoter_id = public.get_user_promoter_id((select auth.uid()))
                ))
          )
        )
      );
  ELSE
    -- user_id column doesn't exist, use attendee_id (legacy schema)
    DROP POLICY IF EXISTS "Attendees can read their own XP" ON public.xp_ledger;
    DROP POLICY IF EXISTS "Event access users can read XP" ON public.xp_ledger;
    DROP POLICY IF EXISTS "Event access users can read XP for events" ON public.xp_ledger;
    
    CREATE POLICY "Attendees can read their own XP"
      ON public.xp_ledger FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.attendees a
          WHERE a.id = xp_ledger.attendee_id
          AND a.user_id = (select auth.uid())
        )
      );

    CREATE POLICY "Event access users can read XP for events"
      ON public.xp_ledger FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = xp_ledger.event_id
          AND (
            -- Organizer
            (public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
             AND e.organizer_id = public.get_user_organizer_id((select auth.uid())))
            -- Venue admin
            OR (public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
                AND e.venue_id = public.get_user_venue_id((select auth.uid())))
            -- Promoter
            OR (public.user_has_role((select auth.uid()), 'promoter'::user_role)
                AND EXISTS (
                  SELECT 1 FROM public.event_promoters ep
                  WHERE ep.event_id = e.id
                  AND ep.promoter_id = public.get_user_promoter_id((select auth.uid()))
                ))
          )
        )
      );
  END IF;
END $$;

-- ============================================
-- USER BADGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can read own badges" ON public.user_badges;
DROP POLICY IF EXISTS "Organizers can award badges" ON public.user_badges;

CREATE POLICY "Users can read own badges"
  ON public.user_badges FOR SELECT
  USING (user_id = (select auth.uid()));

-- Organizers/venues can award badges
-- Check if is_giftable column exists (from migration 044) or use simpler policy
DO $$
BEGIN
  -- Check if is_giftable column exists in badges table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'badges' 
    AND column_name = 'is_giftable'
  ) THEN
    -- is_giftable column exists (unified XP system)
    CREATE POLICY "Organizers can award badges"
      ON public.user_badges FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.badges b
          WHERE b.id = user_badges.badge_id
          AND b.is_giftable = true
        )
        AND (
          public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
          OR public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
          OR public.user_has_role((select auth.uid()), 'superadmin'::user_role)
        )
      );
  ELSE
    -- is_giftable column doesn't exist, use simpler policy
    CREATE POLICY "Organizers can award badges"
      ON public.user_badges FOR INSERT
      WITH CHECK (
        public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
        OR public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
        OR public.user_has_role((select auth.uid()), 'superadmin'::user_role)
      );
  END IF;
END $$;

-- ============================================
-- ATTENDEES POLICIES
-- ============================================
-- Fix auth_rls_initplan and consolidate multiple permissive policies

DROP POLICY IF EXISTS "attendees_own_select" ON public.attendees;
DROP POLICY IF EXISTS "attendees_own_update" ON public.attendees;
DROP POLICY IF EXISTS "attendees_public_insert" ON public.attendees;
DROP POLICY IF EXISTS "attendees_superadmin" ON public.attendees;

-- Consolidated SELECT policy (fixes auth_rls_initplan)
CREATE POLICY "attendees_own_select"
  ON public.attendees FOR SELECT
  USING (user_id = (select auth.uid()) OR public.user_is_superadmin((select auth.uid())));

-- Consolidated UPDATE policy (fixes auth_rls_initplan)
CREATE POLICY "attendees_own_update"
  ON public.attendees FOR UPDATE
  USING (user_id = (select auth.uid()) OR public.user_is_superadmin((select auth.uid())))
  WITH CHECK (user_id = (select auth.uid()) OR public.user_is_superadmin((select auth.uid())));

-- Consolidated INSERT policy (fixes multiple_permissive_policies)
-- Combines attendees_public_insert and attendees_superadmin INSERT
-- Single policy allows both public (anon) and superadmin (authenticated) to insert
CREATE POLICY "attendees_insert"
  ON public.attendees FOR INSERT
  WITH CHECK (true);  -- Public can insert (for registration), superadmin can also insert

-- Superadmin DELETE policy (fixes auth_rls_initplan)
CREATE POLICY "attendees_superadmin_delete"
  ON public.attendees FOR DELETE
  USING (public.user_is_superadmin((select auth.uid())));

-- ============================================
-- REGISTRATIONS POLICIES
-- ============================================
-- Fix auth_rls_initplan and consolidate multiple permissive policies

DROP POLICY IF EXISTS "registrations_own_select" ON public.registrations;
DROP POLICY IF EXISTS "registrations_public_insert" ON public.registrations;
DROP POLICY IF EXISTS "registrations_superadmin" ON public.registrations;

-- Consolidated SELECT policy (fixes auth_rls_initplan)
CREATE POLICY "registrations_own_select"
  ON public.registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.attendees a
      WHERE a.id = registrations.attendee_id
      AND a.user_id = (select auth.uid())
    )
    OR public.user_is_superadmin((select auth.uid()))
  );

-- Consolidated INSERT policy (fixes multiple_permissive_policies)
-- Combines registrations_public_insert and registrations_superadmin INSERT
-- Single policy allows both public (anon) and superadmin (authenticated) to insert
CREATE POLICY "registrations_insert"
  ON public.registrations FOR INSERT
  WITH CHECK (true);  -- Public can insert (for registration), superadmin can also insert

-- Superadmin UPDATE policy (fixes auth_rls_initplan)
CREATE POLICY "registrations_superadmin_update"
  ON public.registrations FOR UPDATE
  USING (public.user_is_superadmin((select auth.uid())))
  WITH CHECK (public.user_is_superadmin((select auth.uid())));

-- Superadmin DELETE policy (fixes auth_rls_initplan)
CREATE POLICY "registrations_superadmin_delete"
  ON public.registrations FOR DELETE
  USING (public.user_is_superadmin((select auth.uid())));

-- ============================================
-- EVENTS POLICIES
-- ============================================
-- Fix auth_rls_initplan

DROP POLICY IF EXISTS "events_public_published" ON public.events;
DROP POLICY IF EXISTS "events_superadmin" ON public.events;
DROP POLICY IF EXISTS "events_organizer_read" ON public.events;
DROP POLICY IF EXISTS "events_venue_read" ON public.events;

CREATE POLICY "events_public_published"
  ON public.events FOR SELECT
  USING (status = 'published');

CREATE POLICY "events_superadmin"
  ON public.events FOR ALL
  USING (public.user_is_superadmin((select auth.uid())));

CREATE POLICY "events_organizer_read"
  ON public.events FOR SELECT
  USING (
    organizer_id = ANY(public.get_user_organizer_ids((select auth.uid())))
  );

CREATE POLICY "events_venue_read"
  ON public.events FOR SELECT
  USING (
    venue_id = ANY(public.get_user_venue_ids((select auth.uid())))
  );

-- ============================================
-- VENUE_USERS POLICIES
-- ============================================
-- Fix auth_rls_initplan

DROP POLICY IF EXISTS "venue_users_own_select" ON public.venue_users;
DROP POLICY IF EXISTS "venue_users_superadmin" ON public.venue_users;

CREATE POLICY "venue_users_own_select"
  ON public.venue_users FOR SELECT
  USING (user_id = (select auth.uid()) OR public.user_is_superadmin((select auth.uid())));

CREATE POLICY "venue_users_superadmin"
  ON public.venue_users FOR ALL
  USING (public.user_is_superadmin((select auth.uid())));

-- ============================================
-- ORGANIZER_USERS POLICIES
-- ============================================
-- Fix auth_rls_initplan

DROP POLICY IF EXISTS "organizer_users_own_select" ON public.organizer_users;
DROP POLICY IF EXISTS "organizer_users_superadmin" ON public.organizer_users;

CREATE POLICY "organizer_users_own_select"
  ON public.organizer_users FOR SELECT
  USING (user_id = (select auth.uid()) OR public.user_is_superadmin((select auth.uid())));

CREATE POLICY "organizer_users_superadmin"
  ON public.organizer_users FOR ALL
  USING (public.user_is_superadmin((select auth.uid())));

-- ============================================
-- CHECKINS POLICIES
-- ============================================
-- Fix auth_rls_initplan and consolidate multiple permissive policies

DROP POLICY IF EXISTS "checkins_own_select" ON public.checkins;
DROP POLICY IF EXISTS "checkins_superadmin" ON public.checkins;
DROP POLICY IF EXISTS "checkins_staff_insert" ON public.checkins;
DROP POLICY IF EXISTS "checkins_staff_update" ON public.checkins;

-- Consolidated SELECT policy (fixes auth_rls_initplan)
CREATE POLICY "checkins_own_select"
  ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.attendees a ON a.id = r.attendee_id
      WHERE r.id = checkins.registration_id
      AND a.user_id = (select auth.uid())
    )
    OR public.user_is_superadmin((select auth.uid()))
  );

-- Consolidated INSERT policy (fixes auth_rls_initplan and multiple_permissive_policies)
-- Combines checkins_staff_insert and checkins_superadmin INSERT
CREATE POLICY "checkins_insert"
  ON public.checkins FOR INSERT
  WITH CHECK (
    public.user_has_role((select auth.uid()), 'door_staff'::user_role)
    OR public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
    OR public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
    OR public.user_is_superadmin((select auth.uid()))
  );

-- Consolidated UPDATE policy (fixes auth_rls_initplan and multiple_permissive_policies)
-- Combines checkins_staff_update and checkins_superadmin UPDATE
CREATE POLICY "checkins_update"
  ON public.checkins FOR UPDATE
  USING (
    public.user_has_role((select auth.uid()), 'door_staff'::user_role)
    OR public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
    OR public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
    OR public.user_is_superadmin((select auth.uid()))
  );

-- Consolidated DELETE policy (fixes auth_rls_initplan)
CREATE POLICY "checkins_delete"
  ON public.checkins FOR DELETE
  USING (public.user_is_superadmin((select auth.uid())));

-- ============================================
-- INVITE_QR_CODES POLICIES
-- ============================================
-- Fix auth_rls_initplan

DROP POLICY IF EXISTS "Public can read invite codes" ON public.invite_qr_codes;
DROP POLICY IF EXISTS "Users can create invite codes" ON public.invite_qr_codes;
DROP POLICY IF EXISTS "Users can manage invite codes" ON public.invite_qr_codes;

CREATE POLICY "Public can read invite codes"
  ON public.invite_qr_codes FOR SELECT
  USING (true);

CREATE POLICY "Users can create invite codes"
  ON public.invite_qr_codes FOR INSERT
  WITH CHECK (
    created_by = (select auth.uid())
    OR public.user_is_superadmin((select auth.uid()))
    OR (
      public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = (select auth.uid())
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = (select auth.uid()))
        )
      )
    )
    OR (
      public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = (select auth.uid())
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = (select auth.uid()))
        )
      )
    )
    OR (
      public.user_has_role((select auth.uid()), 'promoter'::user_role)
      AND creator_role = 'promoter'
    )
  );

CREATE POLICY "Users can manage invite codes"
  ON public.invite_qr_codes FOR ALL
  USING (
    created_by = (select auth.uid())
    OR public.user_is_superadmin((select auth.uid()))
    OR (
      public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = (select auth.uid())
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = (select auth.uid()))
        )
      )
    )
    OR (
      public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = (select auth.uid())
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = (select auth.uid()))
        )
      )
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR public.user_is_superadmin((select auth.uid()))
    OR (
      public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND (
          EXISTS (
            SELECT 1 FROM public.organizer_users ou
            WHERE ou.organizer_id = e.organizer_id
            AND ou.user_id = (select auth.uid())
          )
          OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = (select auth.uid()))
        )
      )
    )
    OR (
      public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
      AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = invite_qr_codes.event_id
        AND e.venue_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.venue_users vu
            WHERE vu.venue_id = e.venue_id
            AND vu.user_id = (select auth.uid())
          )
          OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = (select auth.uid()))
        )
      )
    )
  );

-- ============================================
-- REFERRAL_CLICKS POLICIES
-- ============================================
-- Fix auth_rls_initplan

DROP POLICY IF EXISTS "Service role can insert referral clicks" ON public.referral_clicks;
DROP POLICY IF EXISTS "Users can read their own referral clicks" ON public.referral_clicks;
DROP POLICY IF EXISTS "Event organizers can read referral clicks for their events" ON public.referral_clicks;
DROP POLICY IF EXISTS "Venue admins can read referral clicks for their venue events" ON public.referral_clicks;

CREATE POLICY "Service role can insert referral clicks"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read their own referral clicks"
  ON public.referral_clicks FOR SELECT
  USING (
    referrer_user_id = (select auth.uid())
    OR public.user_is_superadmin((select auth.uid()))
  );

CREATE POLICY "Event organizers can read referral clicks for their events"
  ON public.referral_clicks FOR SELECT
  USING (
    public.user_has_role((select auth.uid()), 'event_organizer'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = referral_clicks.event_id
      AND (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = e.organizer_id
          AND ou.user_id = (select auth.uid())
        )
        OR e.organizer_id IN (SELECT id FROM public.organizers WHERE created_by = (select auth.uid()))
      )
    )
  );

CREATE POLICY "Venue admins can read referral clicks for their venue events"
  ON public.referral_clicks FOR SELECT
  USING (
    public.user_has_role((select auth.uid()), 'venue_admin'::user_role)
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = referral_clicks.event_id
      AND e.venue_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = e.venue_id
          AND vu.user_id = (select auth.uid())
        )
        OR e.venue_id IN (SELECT id FROM public.venues WHERE created_by = (select auth.uid()))
      )
    )
  );

-- ============================================
-- VENUE_FAVORITES POLICIES (if table exists)
-- ============================================
-- Fix auth_rls_initplan

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venue_favorites') THEN
    DROP POLICY IF EXISTS "Users can read own favorites" ON public.venue_favorites;
    DROP POLICY IF EXISTS "Users can insert own favorites" ON public.venue_favorites;
    DROP POLICY IF EXISTS "Users can delete own favorites" ON public.venue_favorites;
    DROP POLICY IF EXISTS "Superadmins can manage all favorites" ON public.venue_favorites;

    CREATE POLICY "Users can read own favorites"
      ON public.venue_favorites FOR SELECT
      USING ((select auth.uid()) = user_id);

    CREATE POLICY "Users can insert own favorites"
      ON public.venue_favorites FOR INSERT
      WITH CHECK ((select auth.uid()) = user_id);

    CREATE POLICY "Users can delete own favorites"
      ON public.venue_favorites FOR DELETE
      USING ((select auth.uid()) = user_id);

    CREATE POLICY "Superadmins can manage all favorites"
      ON public.venue_favorites FOR ALL
      USING (public.user_is_superadmin((select auth.uid())))
      WITH CHECK (public.user_is_superadmin((select auth.uid())));
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

-- Add comments conditionally based on which policies exist
DO $$
BEGIN
  -- Comment on xp_ledger policy (check which one exists)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'xp_ledger' 
    AND policyname = 'Users can read own XP'
  ) THEN
    EXECUTE 'COMMENT ON POLICY "Users can read own XP" ON public.xp_ledger IS ''Optimized: Uses (select auth.uid()) to prevent re-evaluation per row''';
  ELSIF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'xp_ledger' 
    AND policyname = 'Attendees can read their own XP'
  ) THEN
    EXECUTE 'COMMENT ON POLICY "Attendees can read their own XP" ON public.xp_ledger IS ''Optimized: Uses (select auth.uid()) to prevent re-evaluation per row''';
  END IF;
END $$;

COMMENT ON POLICY "attendees_insert" ON public.attendees IS 'Consolidated: Combines public insert and superadmin insert policies';
COMMENT ON POLICY "registrations_insert" ON public.registrations IS 'Consolidated: Combines public insert and superadmin insert policies';
COMMENT ON POLICY "checkins_insert" ON public.checkins IS 'Consolidated: Combines staff insert and superadmin insert policies';
COMMENT ON POLICY "checkins_update" ON public.checkins IS 'Consolidated: Combines staff update and superadmin update policies';

