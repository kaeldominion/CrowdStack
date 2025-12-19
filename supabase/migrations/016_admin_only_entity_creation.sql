-- Restrict venue and organizer creation to superadmin only
-- Regular users cannot create venues or organizers - only admin can do this

-- ============================================
-- VENUES: Remove self-creation policy
-- ============================================

-- Drop the policy that allows venue admins to create their own venues
DROP POLICY IF EXISTS "Venue admins can manage their venue" ON public.venues;

-- Create new policies that only allow superadmin to create venues
-- Regular users can only read/update venues they're assigned to

-- Superadmin can do everything (handled via service role in practice)
-- For RLS, we'll rely on service role bypass or explicit superadmin check

-- Users can read venues they're assigned to (via venue_users or created_by)
-- This policy should already exist from migration 013, but ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'venues' 
    AND policyname = 'Users can read venues they''re assigned to'
  ) THEN
    CREATE POLICY "Users can read venues they're assigned to"
      ON public.venues FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = venues.id
          AND vu.user_id = auth.uid()
        )
        OR venues.created_by = auth.uid()
      );
  END IF;
END $$;

-- Users can update venues they're assigned to (but not create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'venues' 
    AND policyname = 'Users can update venues they''re assigned to'
  ) THEN
    CREATE POLICY "Users can update venues they're assigned to"
      ON public.venues FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = venues.id
          AND vu.user_id = auth.uid()
        )
        OR venues.created_by = auth.uid()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.venue_users vu
          WHERE vu.venue_id = venues.id
          AND vu.user_id = auth.uid()
        )
        OR venues.created_by = auth.uid()
      );
  END IF;
END $$;

-- No INSERT policy for regular users - only service role (superadmin) can create

-- ============================================
-- ORGANIZERS: Remove self-creation policy
-- ============================================

-- Drop the policy that allows organizers to create their own organizer record
DROP POLICY IF EXISTS "Organizers can manage their organizer record" ON public.organizers;

-- Users can read organizers they're assigned to (via organizer_users or created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizers' 
    AND policyname = 'Users can read organizers they''re assigned to'
  ) THEN
    CREATE POLICY "Users can read organizers they're assigned to"
      ON public.organizers FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = organizers.id
          AND ou.user_id = auth.uid()
        )
        OR organizers.created_by = auth.uid()
      );
  END IF;
END $$;

-- Users can update organizers they're assigned to (but not create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizers' 
    AND policyname = 'Users can update organizers they''re assigned to'
  ) THEN
    CREATE POLICY "Users can update organizers they're assigned to"
      ON public.organizers FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = organizers.id
          AND ou.user_id = auth.uid()
        )
        OR organizers.created_by = auth.uid()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = organizers.id
          AND ou.user_id = auth.uid()
        )
        OR organizers.created_by = auth.uid()
      );
  END IF;
END $$;

-- No INSERT policy for regular users - only service role (superadmin) can create

COMMENT ON POLICY "Users can update venues they're assigned to" ON public.venues IS 'Users can update venues they are assigned to, but cannot create new venues. Only superadmin can create venues.';
COMMENT ON POLICY "Users can update organizers they're assigned to" ON public.organizers IS 'Users can update organizers they are assigned to, but cannot create new organizers. Only superadmin can create organizers.';

