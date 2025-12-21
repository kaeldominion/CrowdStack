-- XP Awarding System Migration
-- Creates unified XP awarding functions and triggers

-- ============================================
-- 1. UNIFIED XP AWARDING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_source_type xp_source_type,
  p_role_context TEXT,
  p_event_id UUID DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
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
  
  -- Note: user_xp_summary refresh should be done periodically or via trigger
  -- For MVP, we'll rely on periodic refresh or manual refresh
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. AUTOMATIC TRIGGERS
-- ============================================

-- Trigger: Award XP on check-in
CREATE OR REPLACE FUNCTION on_checkin_award_xp()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER checkin_xp_trigger
  AFTER INSERT ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION on_checkin_award_xp();

-- Trigger: Award XP on registration (early registration bonus)
CREATE OR REPLACE FUNCTION on_registration_award_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_attendee_user_id UUID;
  v_promoter_user_id UUID;
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
  
  -- Award promoter XP for referral registration
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER registration_xp_trigger
  AFTER INSERT ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION on_registration_award_xp();

-- ============================================
-- 3. ROLE-SPECIFIC DISPLAY FUNCTIONS
-- ============================================

-- Attendee view: Show XP as "Status" or "Level"
CREATE OR REPLACE FUNCTION get_attendee_xp_view(p_user_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Promoter view: Show XP as "Performance Score"
CREATE OR REPLACE FUNCTION get_promoter_xp_view(p_user_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Organizer view: Show XP as trust metrics
CREATE OR REPLACE FUNCTION get_organizer_xp_view(p_user_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

