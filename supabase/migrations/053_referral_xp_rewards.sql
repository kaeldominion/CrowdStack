-- Referral XP Rewards Migration
-- Adds XP rewards for user referrals (not just promoter referrals)

-- ============================================
-- 1. ADD NEW XP SOURCE TYPES
-- ============================================

-- Check if xp_source_type enum exists, if not create it first
DO $$
BEGIN
  -- Check if the enum type exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xp_source_type') THEN
    -- Create the enum type with all values (including the new ones)
    CREATE TYPE xp_source_type AS ENUM (
      -- Attendee sources
      'ATTENDED_EVENT',
      'EARLY_REGISTRATION',
      'REPEAT_VENUE_ATTENDANCE',
      'PROFILE_COMPLETION',
      'SOCIAL_CONNECTION',
      'PHOTO_TAGGED',
      'TABLE_SPEND',
      'NO_SHOW_PENALTY',
      -- Promoter sources
      'PROMOTER_REFERRAL_REGISTRATION',
      'PROMOTER_REFERRAL_CHECKIN',
      'PROMOTER_CONVERSION_BONUS',
      'PROMOTER_RELIABILITY_BONUS',
      'PROMOTER_QUALITY_BONUS',
      'PROMOTER_DISPUTE_PENALTY',
      -- Organizer sources
      'ORGANIZER_EVENT_COMPLETED',
      'ORGANIZER_ATTENDANCE_ACCURACY',
      'ORGANIZER_PAYOUT_ON_TIME',
      'ORGANIZER_VENUE_SATISFACTION',
      'ORGANIZER_PROMOTER_RETENTION',
      -- Venue sources
      'VENUE_EVENT_SUCCESS',
      'VENUE_FAIR_PAYOUT',
      'VENUE_REPEAT_ORGANIZERS',
      -- User referral sources (NEW)
      'USER_REFERRAL_CLICK',
      'USER_REFERRAL_REGISTRATION'
    );
  ELSE
    -- Type exists, just add the new values if they don't exist
    -- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
    -- So we'll try to add them and ignore errors if they already exist
    BEGIN
      ALTER TYPE xp_source_type ADD VALUE 'USER_REFERRAL_CLICK';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, ignore
      NULL;
    END;
    
    BEGIN
      ALTER TYPE xp_source_type ADD VALUE 'USER_REFERRAL_REGISTRATION';
    EXCEPTION WHEN duplicate_object THEN
      -- Value already exists, ignore
      NULL;
    END;
  END IF;
END $$;

-- ============================================
-- 2. UPDATE REGISTRATION TRIGGER TO AWARD XP FOR USER REFERRALS
-- ============================================

CREATE OR REPLACE FUNCTION on_registration_award_xp()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE FUNCTION TO AWARD XP FOR REFERRAL CLICKS
-- ============================================

-- This will be called from the API when a click is tracked
CREATE OR REPLACE FUNCTION award_referral_click_xp(
  p_referrer_user_id UUID,
  p_event_id UUID,
  p_click_id UUID
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION award_referral_click_xp TO authenticated;
GRANT EXECUTE ON FUNCTION award_referral_click_xp TO service_role;

