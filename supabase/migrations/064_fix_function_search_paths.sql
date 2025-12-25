-- Fix Function Search Paths
-- Adds SET search_path = public, pg_temp to all functions to prevent search path injection
-- This addresses all function_search_path_mutable warnings

-- ============================================
-- 1. UPDATE TRIGGER FUNCTIONS
-- ============================================

-- update_audience_messages_updated_at
CREATE OR REPLACE FUNCTION update_audience_messages_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- set_updated_at (generic trigger function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_event_messages_updated_at
CREATE OR REPLACE FUNCTION public.update_event_messages_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_event_message_board_updated_at
CREATE OR REPLACE FUNCTION update_event_message_board_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_attendees_updated_at
CREATE OR REPLACE FUNCTION public.update_attendees_updated_at()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. UPDATE DOOR STAFF FUNCTIONS
-- ============================================

-- ensure_door_staff_role
CREATE OR REPLACE FUNCTION public.ensure_door_staff_role(p_user_id UUID)
RETURNS VOID
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add door_staff role if not already present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'door_staff')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- trigger_ensure_door_staff_role
CREATE OR REPLACE FUNCTION public.trigger_ensure_door_staff_role()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.ensure_door_staff_role(NEW.user_id);
  RETURN NEW;
END;
$$;

-- ============================================
-- 3. UPDATE PERMISSION FUNCTIONS
-- ============================================

-- user_has_venue_permission
CREATE OR REPLACE FUNCTION public.user_has_venue_permission(
  user_uuid UUID,
  venue_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions JSONB;
  is_full_admin BOOLEAN;
BEGIN
  -- Get user's permissions for this venue
  SELECT permissions INTO user_permissions
  FROM public.venue_users
  WHERE user_id = user_uuid AND venue_id = venue_uuid;

  -- If no assignment found, check if user is creator
  IF user_permissions IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.venues
      WHERE id = venue_uuid AND created_by = user_uuid
    ) INTO is_full_admin;
    
    -- Creator has all permissions
    RETURN is_full_admin;
  END IF;

  -- Check if full_admin is true
  is_full_admin := COALESCE((user_permissions->>'full_admin')::boolean, false);
  IF is_full_admin THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((user_permissions->>permission_name)::boolean, false);
END;
$$;

-- user_is_venue_member
CREATE OR REPLACE FUNCTION public.user_is_venue_member(p_user_id uuid, p_venue_id uuid)
RETURNS boolean
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venue_users
    WHERE user_id = p_user_id
    AND venue_id = p_venue_id
  );
$$;

-- user_has_organizer_permission
CREATE OR REPLACE FUNCTION public.user_has_organizer_permission(
  user_uuid UUID,
  organizer_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions JSONB;
  is_full_admin BOOLEAN;
BEGIN
  -- Get user's permissions for this organizer
  SELECT permissions INTO user_permissions
  FROM public.organizer_users
  WHERE user_id = user_uuid AND organizer_id = organizer_uuid;

  -- If no assignment found, check if user is creator
  IF user_permissions IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.organizers
      WHERE id = organizer_uuid AND created_by = user_uuid
    ) INTO is_full_admin;
    
    -- Creator has all permissions
    RETURN is_full_admin;
  END IF;

  -- Check if full_admin is true
  is_full_admin := COALESCE((user_permissions->>'full_admin')::boolean, false);
  IF is_full_admin THEN
    RETURN true;
  END IF;

  -- Check specific permission
  RETURN COALESCE((user_permissions->>permission_name)::boolean, false);
END;
$$;

-- ============================================
-- 4. UPDATE HELPER FUNCTIONS FROM MIGRATION 029
-- ============================================

-- user_is_organizer_member
CREATE OR REPLACE FUNCTION public.user_is_organizer_member(p_user_id uuid, p_organizer_id uuid)
RETURNS boolean
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizer_users
    WHERE user_id = p_user_id
    AND organizer_id = p_organizer_id
  );
$$;

-- get_user_organizer_ids
CREATE OR REPLACE FUNCTION public.get_user_organizer_ids(p_user_id uuid)
RETURNS uuid[]
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(organizer_id), '{}')
  FROM public.organizer_users
  WHERE user_id = p_user_id;
$$;

-- get_user_venue_ids
CREATE OR REPLACE FUNCTION public.get_user_venue_ids(p_user_id uuid)
RETURNS uuid[]
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(array_agg(venue_id), '{}')
  FROM public.venue_users
  WHERE user_id = p_user_id;
$$;

-- ============================================
-- 5. UPDATE PROMOTER FUNCTIONS
-- ============================================

-- get_promoters_for_venue (keep original return type)
CREATE OR REPLACE FUNCTION public.get_promoters_for_venue(venue_uuid UUID)
RETURNS TABLE(promoter_id UUID)
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ep.promoter_id
  FROM public.event_promoters ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE e.venue_id = venue_uuid;
END;
$$;

-- get_promoters_for_organizer (keep original return type)
CREATE OR REPLACE FUNCTION public.get_promoters_for_organizer(organizer_uuid UUID)
RETURNS TABLE(promoter_id UUID)
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ep.promoter_id
  FROM public.event_promoters ep
  JOIN public.events e ON ep.event_id = e.id
  WHERE e.organizer_id = organizer_uuid;
END;
$$;

-- get_organizers_for_venue (keep original return type)
CREATE OR REPLACE FUNCTION public.get_organizers_for_venue(venue_uuid UUID)
RETURNS TABLE(organizer_id UUID)
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e.organizer_id
  FROM public.events e
  WHERE e.venue_id = venue_uuid
  AND e.organizer_id IS NOT NULL;
END;
$$;

-- get_organizers_worked_with (keep original return type)
CREATE OR REPLACE FUNCTION public.get_organizers_worked_with(organizer_uuid UUID)
RETURNS TABLE(organizer_id UUID)
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT e2.organizer_id
  FROM public.events e1
  JOIN public.events e2 ON (
    -- Same venue
    (e1.venue_id IS NOT NULL AND e2.venue_id = e1.venue_id)
    OR
    -- Same event (co-organizers - if we add that feature later)
    (e1.id = e2.id)
  )
  WHERE e1.organizer_id = organizer_uuid
  AND e2.organizer_id != organizer_uuid
  AND e2.organizer_id IS NOT NULL;
END;
$$;

-- ============================================
-- 6. UPDATE XP VIEW FUNCTIONS
-- ============================================

-- Drop and recreate get_attendee_xp_view (need to drop first to change signature if needed)
DROP FUNCTION IF EXISTS get_attendee_xp_view(UUID);

-- get_attendee_xp_view (keep original return type JSONB and full implementation)
CREATE OR REPLACE FUNCTION get_attendee_xp_view(p_user_id UUID)
RETURNS JSONB
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp INTEGER;
  v_level_info RECORD;
BEGIN
  -- Calculate total XP
  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp
  FROM xp_ledger
  WHERE user_id = p_user_id;
  
  -- Get level info - use a simpler approach with a CTE
  WITH level_data AS (
    SELECT * FROM calculate_level(v_total_xp) LIMIT 1
  )
  SELECT * INTO v_level_info FROM level_data;
  
  RETURN jsonb_build_object(
    'total_xp', v_total_xp,
    'level', COALESCE(v_level_info.level, 0),
    'xp_in_level', COALESCE(v_level_info.xp_in_level, v_total_xp),
    'xp_for_next_level', COALESCE(v_level_info.xp_for_next_level, 100),
    'progress_pct', COALESCE(v_level_info.progress_pct, 0),
    'attendee_xp', (
      SELECT COALESCE(SUM(amount), 0)
      FROM xp_ledger
      WHERE user_id = p_user_id
      AND role_context = 'attendee'
    ),
    'recent_activity', (
      SELECT jsonb_agg(jsonb_build_object(
        'amount', amount,
        'source', source_type,
        'description', description,
        'date', created_at
      ) ORDER BY created_at DESC)
      FROM (
        SELECT amount, source_type, description, created_at
        FROM xp_ledger
        WHERE user_id = p_user_id
        AND role_context = 'attendee'
        ORDER BY created_at DESC
        LIMIT 10
      ) recent
    )
  );
END;
$$;

-- Drop and recreate get_promoter_xp_view
DROP FUNCTION IF EXISTS get_promoter_xp_view(UUID);

-- get_promoter_xp_view (keep original return type JSONB and full implementation)
CREATE OR REPLACE FUNCTION get_promoter_xp_view(p_user_id UUID)
RETURNS JSONB
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp INTEGER;
  v_promoter_xp INTEGER;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN role_context = 'promoter' THEN amount ELSE 0 END), 0)
  INTO v_total_xp, v_promoter_xp
  FROM xp_ledger
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'total_xp', v_total_xp,
    'performance_score', v_promoter_xp,
    'reliability_score', (
      SELECT COUNT(*) FILTER (WHERE source_type = 'PROMOTER_RELIABILITY_BONUS')
      FROM xp_ledger
      WHERE user_id = p_user_id
    ),
    'conversion_bonuses', (
      SELECT COUNT(*) FILTER (WHERE source_type = 'PROMOTER_CONVERSION_BONUS')
      FROM xp_ledger
      WHERE user_id = p_user_id
    ),
    'stats', (
      SELECT jsonb_build_object(
        'referrals', COUNT(*) FILTER (WHERE source_type IN ('PROMOTER_REFERRAL_REGISTRATION', 'PROMOTER_REFERRAL_CHECKIN')),
        'quality_bonuses', COUNT(*) FILTER (WHERE source_type = 'PROMOTER_QUALITY_BONUS'),
        'penalties', COUNT(*) FILTER (WHERE source_type = 'PROMOTER_DISPUTE_PENALTY')
      )
      FROM xp_ledger
      WHERE user_id = p_user_id
      AND role_context = 'promoter'
    )
  );
END;
$$;

-- Drop and recreate get_organizer_xp_view
DROP FUNCTION IF EXISTS get_organizer_xp_view(UUID);

-- get_organizer_xp_view (keep original return type JSONB and full implementation)
CREATE OR REPLACE FUNCTION get_organizer_xp_view(p_user_id UUID)
RETURNS JSONB
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp INTEGER;
  v_organizer_xp INTEGER;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN role_context = 'organizer' THEN amount ELSE 0 END), 0)
  INTO v_total_xp, v_organizer_xp
  FROM xp_ledger
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'total_xp', v_total_xp,
    'trust_score', v_organizer_xp,
    'stats', (
      SELECT jsonb_build_object(
        'events_completed', COUNT(*) FILTER (WHERE source_type = 'ORGANIZER_EVENT_COMPLETED'),
        'on_time_payouts', COUNT(*) FILTER (WHERE source_type = 'ORGANIZER_PAYOUT_ON_TIME'),
        'accuracy_bonuses', COUNT(*) FILTER (WHERE source_type = 'ORGANIZER_ATTENDANCE_ACCURACY'),
        'venue_satisfaction', COUNT(*) FILTER (WHERE source_type = 'ORGANIZER_VENUE_SATISFACTION'),
        'promoter_retention', COUNT(*) FILTER (WHERE source_type = 'ORGANIZER_PROMOTER_RETENTION')
      )
      FROM xp_ledger
      WHERE user_id = p_user_id
      AND role_context = 'organizer'
    )
  );
END;
$$;

-- ============================================
-- 7. UPDATE CORE HELPER FUNCTIONS
-- ============================================

-- user_is_superadmin
CREATE OR REPLACE FUNCTION public.user_is_superadmin(user_uuid UUID)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid 
    AND role::text = 'superadmin'
  );
$$;

-- award_xp (core XP awarding function)
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_source_type xp_source_type,
  p_role_context TEXT,
  p_event_id UUID DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Validate role_context
  IF p_role_context NOT IN ('attendee', 'promoter', 'organizer', 'venue') THEN
    RAISE EXCEPTION 'Invalid role_context: %', p_role_context;
  END IF;
  
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;
  
  -- Insert XP entry
  INSERT INTO xp_ledger (
    user_id,
    amount,
    source_type,
    role_context,
    event_id,
    related_id,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    p_source_type,
    p_role_context,
    p_event_id,
    p_related_id,
    COALESCE(p_description, p_source_type::TEXT),
    p_metadata,
    NOW()
  ) RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$;

-- on_checkin_award_xp
CREATE OR REPLACE FUNCTION on_checkin_award_xp()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attendee_user_id UUID;
  v_promoter_user_id UUID;
  v_event_id UUID;
  v_referral_promoter_id UUID;
  v_attendee_id UUID;
BEGIN
  -- Get event, attendee_id, and referral_promoter_id from registration
  SELECT r.event_id, r.attendee_id, r.referral_promoter_id
  INTO v_event_id, v_attendee_id, v_referral_promoter_id
  FROM registrations r
  WHERE r.id = NEW.registration_id;
  
  -- Get attendee's user_id
  SELECT user_id INTO v_attendee_user_id
  FROM attendees
  WHERE id = v_attendee_id;
  
  -- Award attendee XP if user_id exists
  IF v_attendee_user_id IS NOT NULL THEN
    PERFORM award_xp(
      v_attendee_user_id,
      100,
      'ATTENDED_EVENT'::xp_source_type,
      'attendee',
      v_event_id,
      NULL,
      'Checked in to event',
      jsonb_build_object('registration_id', NEW.registration_id, 'checkin_id', NEW.id)
    );
  END IF;
  
  -- Award promoter XP if referral exists
  IF v_referral_promoter_id IS NOT NULL THEN
    SELECT created_by INTO v_promoter_user_id
    FROM promoters
    WHERE id = v_referral_promoter_id;
    
    IF v_promoter_user_id IS NOT NULL THEN
      PERFORM award_xp(
        v_promoter_user_id,
        50,
        'PROMOTER_REFERRAL_CHECKIN'::xp_source_type,
        'promoter',
        v_event_id,
        v_referral_promoter_id,
        'Referral checked in',
        jsonb_build_object('registration_id', NEW.registration_id, 'checkin_id', NEW.id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- on_registration_award_xp (latest version from migration 053)
CREATE OR REPLACE FUNCTION on_registration_award_xp()
RETURNS TRIGGER
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attendee_user_id UUID;
  v_promoter_user_id UUID;
  v_referrer_user_id UUID;
  v_event_start_time TIMESTAMP WITH TIME ZONE;
  v_event_created_at TIMESTAMP WITH TIME ZONE;
  v_hours_since_creation NUMERIC;
BEGIN
  -- Get attendee's user_id
  SELECT user_id INTO v_attendee_user_id
  FROM attendees
  WHERE id = NEW.attendee_id;
  
  -- Get event info
  SELECT e.start_time, e.created_at INTO v_event_start_time, v_event_created_at
  FROM events e
  WHERE e.id = NEW.event_id;
  
  -- Award promoter XP for referral registration (existing logic)
  IF NEW.referral_promoter_id IS NOT NULL THEN
    SELECT created_by INTO v_promoter_user_id
    FROM promoters
    WHERE id = NEW.referral_promoter_id;
    
    IF v_promoter_user_id IS NOT NULL THEN
      PERFORM award_xp(
        v_promoter_user_id,
        25,
        'PROMOTER_REFERRAL_REGISTRATION'::xp_source_type,
        'promoter',
        NEW.event_id,
        NEW.referral_promoter_id,
        'Referral registration',
        jsonb_build_object('registration_id', NEW.id)
      );
    END IF;
  END IF;
  
  -- NEW: Award XP for general user referrals (any user, not just promoters)
  IF NEW.referred_by_user_id IS NOT NULL THEN
    -- Only award if this is NOT a promoter referral (to avoid double-awarding)
    -- If it's a promoter referral, they already got XP above
    IF NEW.referral_promoter_id IS NULL OR NEW.referred_by_user_id != (
      SELECT created_by FROM promoters WHERE id = NEW.referral_promoter_id
    ) THEN
      PERFORM award_xp(
        NEW.referred_by_user_id,
        15, -- Smaller amount than promoter referrals
        'USER_REFERRAL_REGISTRATION'::xp_source_type,
        'attendee', -- Award as attendee XP (any user can refer)
        NEW.event_id,
        NEW.id, -- related_id = registration_id
        'Someone registered via your referral link',
        jsonb_build_object('registration_id', NEW.id, 'event_id', NEW.event_id)
      );
    END IF;
  END IF;
  
  -- Award early registration bonus (within 24h of event publish)
  IF v_attendee_user_id IS NOT NULL AND v_event_created_at IS NOT NULL THEN
    v_hours_since_creation := EXTRACT(EPOCH FROM (NEW.registered_at - v_event_created_at)) / 3600;
    
    IF v_hours_since_creation <= 24 THEN
      PERFORM award_xp(
        v_attendee_user_id,
        25,
        'EARLY_REGISTRATION'::xp_source_type,
        'attendee',
        NEW.event_id,
        NULL,
        'Early registration (within 24h)',
        jsonb_build_object('registration_id', NEW.id, 'hours_since_publish', v_hours_since_creation)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- award_referral_click_xp
CREATE OR REPLACE FUNCTION award_referral_click_xp(
  p_referrer_user_id UUID,
  p_event_id UUID,
  p_click_id UUID
)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Award small amount of XP for link clicks (encourages sharing)
  -- Only award once per click (dedupe by checking if XP already awarded for this click)
  IF NOT EXISTS (
    SELECT 1 FROM xp_ledger
    WHERE user_id = p_referrer_user_id
      AND source_type = 'USER_REFERRAL_CLICK'
      AND related_id = p_click_id
  ) THEN
    SELECT award_xp(
      p_referrer_user_id,
      2, -- Small reward for clicks (encourages sharing)
      'USER_REFERRAL_CLICK'::xp_source_type,
      'attendee',
      p_event_id,
      p_click_id, -- related_id = referral_click_id
      'Someone clicked your referral link',
      jsonb_build_object('click_id', p_click_id, 'event_id', p_event_id)
    ) INTO v_ledger_id;
  END IF;
  
  RETURN v_ledger_id;
END;
$$;

-- create_invite_token (keep original parameter names and return type)
CREATE OR REPLACE FUNCTION public.create_invite_token(
  role_name user_role,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_uuid UUID DEFAULT NULL
)
RETURNS TEXT
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_text TEXT;
  creator_uuid UUID;
BEGIN
  -- Use provided creator or first user
  creator_uuid := COALESCE(created_by_uuid, public.get_first_user());
  
  -- Generate secure token
  token_text := 'invite-' || role_name::text || '-' || gen_random_uuid()::text;
  
  INSERT INTO public.invite_tokens (token, role, metadata, created_by)
  VALUES (token_text, role_name, metadata, creator_uuid)
  ON CONFLICT (token) DO NOTHING;
  
  RETURN token_text;
END;
$$;

-- get_user_roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID)
RETURNS TABLE(role user_role)
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = user_uuid;
$$;

-- user_has_role
CREATE OR REPLACE FUNCTION public.user_has_role(user_uuid UUID, check_role user_role)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid AND role = check_role
  );
$$;

-- get_user_venue_id
CREATE OR REPLACE FUNCTION public.get_user_venue_id(user_uuid UUID)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT v.id
  FROM public.venues v
  WHERE v.created_by = user_uuid
  LIMIT 1;
$$;

-- get_user_organizer_id
CREATE OR REPLACE FUNCTION public.get_user_organizer_id(user_uuid UUID)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.id
  FROM public.organizers o
  WHERE o.created_by = user_uuid
  LIMIT 1;
$$;

-- is_attendee_for_registration
CREATE OR REPLACE FUNCTION public.is_attendee_for_registration(user_uuid UUID, reg_id UUID)
RETURNS BOOLEAN
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.attendees a ON r.attendee_id = a.id
    WHERE r.id = reg_id AND a.user_id = user_uuid
  );
$$;

-- assign_user_role (keep original parameter names)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  user_uuid UUID,
  role_name user_role,
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_id UUID;
BEGIN
  INSERT INTO public.user_roles (user_id, role, metadata)
  VALUES (user_uuid, role_name, metadata)
  ON CONFLICT (user_id, role) DO UPDATE SET metadata = EXCLUDED.metadata
  RETURNING id INTO role_id;
  RETURN role_id;
END;
$$;

-- get_first_user
CREATE OR REPLACE FUNCTION public.get_first_user()
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1;
$$;

-- get_user_promoter_id
CREATE OR REPLACE FUNCTION public.get_user_promoter_id(user_uuid UUID)
RETURNS UUID
SET search_path = public, pg_temp
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM public.promoters p
  WHERE p.created_by = user_uuid
  LIMIT 1;
$$;

