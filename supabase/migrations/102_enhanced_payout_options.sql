-- Enhanced Payout Options for Promoters
-- Adds support for:
--   - Currency per promoter deal (override event default)
--   - Minimum guest requirements with partial payout
--   - Tiered/repeatable bonuses (e.g., bonus every 20 pax)
--   - Base fixed fee (always paid)
-- ============================================

-- ============================================
-- 1. ADD CURRENCY OVERRIDE TO EVENT_PROMOTERS
-- ============================================

-- Allow currency override per promoter deal (defaults to event currency)
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS currency TEXT;

COMMENT ON COLUMN public.event_promoters.currency IS 'ISO currency code override (e.g., IDR, USD). NULL means use event currency.';

-- ============================================
-- 2. ADD MINIMUM GUEST REQUIREMENT WITH PARTIAL PAYOUT
-- ============================================

-- Minimum guests required for full fixed fee
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS minimum_guests INTEGER;

-- Percentage of fixed fee paid if minimum not met (0-100)
-- e.g., 50 means they get 50% of fixed_fee if they don't meet minimum_guests
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS below_minimum_percent DECIMAL(5, 2) DEFAULT 100;

COMMENT ON COLUMN public.event_promoters.minimum_guests IS 'Minimum guests required for full fixed fee. NULL means no minimum.';
COMMENT ON COLUMN public.event_promoters.below_minimum_percent IS 'Percentage of fixed_fee paid if below minimum_guests (0-100). Default 100 = full payment regardless.';

-- ============================================
-- 3. ADD TIERED/REPEATABLE BONUSES
-- ============================================

-- Replace single bonus with tiered bonus structure
-- Format: [
--   {"threshold": 20, "amount": 600000, "repeatable": true, "label": "Every 20 guests"},
--   {"threshold": 50, "amount": 1000000, "repeatable": false, "label": "50 guest milestone"}
-- ]
-- 
-- "repeatable": true means bonus is awarded every X guests (e.g., every 20 pax = 3 bonuses for 60 guests)
-- "repeatable": false means bonus is one-time when threshold is reached

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS bonus_tiers JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.event_promoters.bonus_tiers IS 'Array of bonus tiers. Each: {threshold: number, amount: number, repeatable: boolean, label?: string}. Repeatable bonuses are awarded multiple times.';

-- ============================================
-- 4. ADD PER-HEAD PERCENTAGE OPTION
-- ============================================

-- Allow per-head based on percentage of ticket/entry price
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS per_head_percent DECIMAL(5, 2);

COMMENT ON COLUMN public.event_promoters.per_head_percent IS 'Alternative to per_head_rate: percentage of ticket price per guest. NULL means use fixed per_head_rate.';

-- ============================================
-- 5. CREATE HELPER FUNCTION TO CALCULATE PAYOUT
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_promoter_payout(
  p_checkins_count INTEGER,
  p_fixed_fee DECIMAL,
  p_minimum_guests INTEGER,
  p_below_minimum_percent DECIMAL,
  p_per_head_rate DECIMAL,
  p_per_head_min INTEGER,
  p_per_head_max INTEGER,
  p_bonus_threshold INTEGER,  -- Legacy single bonus
  p_bonus_amount DECIMAL,     -- Legacy single bonus
  p_bonus_tiers JSONB,        -- New tiered bonuses
  p_manual_adjustment DECIMAL
)
RETURNS TABLE (
  per_head_total DECIMAL,
  fixed_fee_total DECIMAL,
  bonus_total DECIMAL,
  adjustment_total DECIMAL,
  grand_total DECIMAL,
  bonus_breakdown JSONB
) AS $$
DECLARE
  v_per_head DECIMAL := 0;
  v_fixed DECIMAL := 0;
  v_bonus DECIMAL := 0;
  v_bonus_breakdown JSONB := '[]'::jsonb;
  v_counted_guests INTEGER;
  v_tier JSONB;
  v_tier_bonus DECIMAL;
  v_tier_count INTEGER;
BEGIN
  -- Calculate per-head amount
  IF p_per_head_rate IS NOT NULL AND p_per_head_rate > 0 THEN
    v_counted_guests := p_checkins_count;
    
    -- Apply minimum (don't pay if below min)
    IF p_per_head_min IS NOT NULL AND v_counted_guests < p_per_head_min THEN
      v_counted_guests := 0;
    END IF;
    
    -- Apply maximum cap
    IF p_per_head_max IS NOT NULL AND v_counted_guests > p_per_head_max THEN
      v_counted_guests := p_per_head_max;
    END IF;
    
    v_per_head := v_counted_guests * p_per_head_rate;
  END IF;
  
  -- Calculate fixed fee with minimum requirement
  IF p_fixed_fee IS NOT NULL AND p_fixed_fee > 0 THEN
    IF p_minimum_guests IS NOT NULL AND p_checkins_count < p_minimum_guests THEN
      -- Below minimum: apply partial payment
      v_fixed := p_fixed_fee * (COALESCE(p_below_minimum_percent, 100) / 100);
    ELSE
      -- Met minimum or no minimum required
      v_fixed := p_fixed_fee;
    END IF;
  END IF;
  
  -- Calculate bonuses from tiers (new system)
  IF p_bonus_tiers IS NOT NULL AND jsonb_array_length(p_bonus_tiers) > 0 THEN
    FOR v_tier IN SELECT * FROM jsonb_array_elements(p_bonus_tiers)
    LOOP
      v_tier_bonus := 0;
      
      IF (v_tier->>'repeatable')::boolean = true THEN
        -- Repeatable bonus: awarded every X guests
        v_tier_count := FLOOR(p_checkins_count::DECIMAL / (v_tier->>'threshold')::INTEGER);
        IF v_tier_count > 0 THEN
          v_tier_bonus := v_tier_count * (v_tier->>'amount')::DECIMAL;
          v_bonus_breakdown := v_bonus_breakdown || jsonb_build_object(
            'label', COALESCE(v_tier->>'label', 'Repeatable bonus'),
            'threshold', (v_tier->>'threshold')::INTEGER,
            'times_achieved', v_tier_count,
            'amount_per', (v_tier->>'amount')::DECIMAL,
            'total', v_tier_bonus
          );
        END IF;
      ELSE
        -- One-time bonus: awarded once when threshold met
        IF p_checkins_count >= (v_tier->>'threshold')::INTEGER THEN
          v_tier_bonus := (v_tier->>'amount')::DECIMAL;
          v_bonus_breakdown := v_bonus_breakdown || jsonb_build_object(
            'label', COALESCE(v_tier->>'label', 'Milestone bonus'),
            'threshold', (v_tier->>'threshold')::INTEGER,
            'achieved', true,
            'total', v_tier_bonus
          );
        END IF;
      END IF;
      
      v_bonus := v_bonus + v_tier_bonus;
    END LOOP;
  -- Fallback to legacy single bonus
  ELSIF p_bonus_threshold IS NOT NULL AND p_bonus_amount IS NOT NULL AND p_checkins_count >= p_bonus_threshold THEN
    v_bonus := p_bonus_amount;
    v_bonus_breakdown := v_bonus_breakdown || jsonb_build_object(
      'label', 'Target bonus',
      'threshold', p_bonus_threshold,
      'achieved', true,
      'total', p_bonus_amount
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_per_head,
    v_fixed,
    v_bonus,
    COALESCE(p_manual_adjustment, 0),
    v_per_head + v_fixed + v_bonus + COALESCE(p_manual_adjustment, 0),
    v_bonus_breakdown;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.calculate_promoter_payout IS 'Calculate promoter payout based on check-ins and contract terms. Supports per-head, fixed fees with minimums, tiered/repeatable bonuses, and manual adjustments.';

-- ============================================
-- 6. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_event_promoters_currency ON public.event_promoters(currency);
CREATE INDEX IF NOT EXISTS idx_event_promoters_minimum_guests ON public.event_promoters(minimum_guests) WHERE minimum_guests IS NOT NULL;

-- ============================================
-- 7. UPDATE TABLE COMMENTS
-- ============================================

COMMENT ON TABLE public.event_promoters IS 'Enhanced payout system with currency override, minimum requirements, tiered/repeatable bonuses, and per-head percentage options.';

