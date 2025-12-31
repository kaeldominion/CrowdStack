-- Add XP Sources for Event Sharing
-- Adds XP rewards for sharing events and successful conversions from shares

-- ============================================
-- 1. ADD NEW XP SOURCE TYPES
-- ============================================

DO $$
BEGIN
  -- Add new XP source types if they don't exist
  BEGIN
    ALTER TYPE xp_source_type ADD VALUE 'EVENT_SHARED';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER TYPE xp_source_type ADD VALUE 'USER_REFERRAL_CHECKIN';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================
-- 2. UPDATE CHECK-IN TRIGGER TO AWARD XP FOR USER REFERRAL CHECK-INS
-- ============================================

CREATE OR REPLACE FUNCTION on_checkin_award_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_attendee_user_id UUID;
  v_promoter_user_id UUID;
  v_referrer_user_id UUID;
  v_event_id UUID;
  v_referral_promoter_id UUID;
  v_attendee_id UUID;
BEGIN
  -- Get event, attendee_id, referral_promoter_id, and referred_by_user_id from registration
  SELECT r.event_id, r.attendee_id, r.referral_promoter_id, r.referred_by_user_id
  INTO v_event_id, v_attendee_id, v_referral_promoter_id, v_referrer_user_id
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
  
  -- Award promoter XP if referral exists (existing logic)
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
  
  -- NEW: Award XP for general user referral check-ins (any user, not just promoters)
  IF v_referrer_user_id IS NOT NULL THEN
    -- Only award if this is NOT a promoter referral (to avoid double-awarding)
    -- If it's a promoter referral, they already got XP above
    IF v_referral_promoter_id IS NULL OR v_referrer_user_id != (
      SELECT created_by FROM promoters WHERE id = v_referral_promoter_id
    ) THEN
      PERFORM award_xp(
        v_referrer_user_id,
        30, -- Reward for successful check-in from your share
        'USER_REFERRAL_CHECKIN'::xp_source_type,
        'attendee', -- Award as attendee XP (any user can refer)
        v_event_id,
        NEW.registration_id, -- related_id = registration_id
        'Someone checked in via your referral link',
        jsonb_build_object('registration_id', NEW.registration_id, 'checkin_id', NEW.id, 'event_id', v_event_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE FUNCTION TO AWARD XP FOR EVENT SHARES
-- ============================================

-- This will be called from the API when a user shares an event
CREATE OR REPLACE FUNCTION award_event_share_xp(
  p_user_id UUID,
  p_event_id UUID
) RETURNS UUID AS $$
DECLARE
  v_ledger_id UUID;
BEGIN
  -- Award XP for sharing an event (encourages sharing)
  -- Only award once per event per user (dedupe by checking if XP already awarded for this event share)
  IF NOT EXISTS (
    SELECT 1 FROM xp_ledger
    WHERE user_id = p_user_id
      AND source_type = 'EVENT_SHARED'
      AND event_id = p_event_id
  ) THEN
    SELECT award_xp(
      p_user_id,
      5, -- Small reward for sharing (encourages sharing)
      'EVENT_SHARED'::xp_source_type,
      'attendee',
      p_event_id,
      NULL,
      'Shared event',
      jsonb_build_object('event_id', p_event_id)
    ) INTO v_ledger_id;
  END IF;
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION award_event_share_xp TO authenticated;
GRANT EXECUTE ON FUNCTION award_event_share_xp TO service_role;

COMMENT ON FUNCTION award_event_share_xp IS 'Awards XP when a user shares an event. Only awards once per event per user.';

