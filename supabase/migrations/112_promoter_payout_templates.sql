-- Promoter Payout Templates System
-- Allows organizers to create reusable payout configuration templates
-- ============================================

-- ============================================
-- 1. CREATE PROMOTER_PAYOUT_TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.promoter_payout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Currency override
  currency TEXT,
  
  -- Per-head payment fields
  per_head_rate DECIMAL(10, 2),
  per_head_min INTEGER,
  per_head_max INTEGER,
  
  -- Fixed fee with minimum requirement
  fixed_fee DECIMAL(10, 2),
  minimum_guests INTEGER,
  below_minimum_percent DECIMAL(5, 2) DEFAULT 100,
  
  -- Legacy single bonus
  bonus_threshold INTEGER,
  bonus_amount DECIMAL(10, 2),
  
  -- Tiered/repeatable bonuses
  bonus_tiers JSONB DEFAULT '[]'::jsonb,
  
  -- Default template flag (one per organizer)
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_promoter_payout_templates_organizer_id 
  ON public.promoter_payout_templates(organizer_id);

CREATE INDEX IF NOT EXISTS idx_promoter_payout_templates_is_default 
  ON public.promoter_payout_templates(organizer_id, is_default) 
  WHERE is_default = true;

-- ============================================
-- 3. ADD CONSTRAINTS
-- ============================================

-- Ensure only one default template per organizer
CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_payout_templates_one_default_per_organizer
  ON public.promoter_payout_templates(organizer_id)
  WHERE is_default = true;

-- ============================================
-- 4. ADD COMMENTS
-- ============================================

COMMENT ON TABLE public.promoter_payout_templates IS 'Reusable payout configuration templates for organizers to quickly apply when adding promoters to events';
COMMENT ON COLUMN public.promoter_payout_templates.organizer_id IS 'Organizer who owns this template';
COMMENT ON COLUMN public.promoter_payout_templates.name IS 'Template name (e.g., "Standard Per-Head", "VIP Promoter Deal")';
COMMENT ON COLUMN public.promoter_payout_templates.description IS 'Optional description of when to use this template';
COMMENT ON COLUMN public.promoter_payout_templates.currency IS 'ISO currency code override (e.g., IDR, USD). NULL means use event currency.';
COMMENT ON COLUMN public.promoter_payout_templates.per_head_rate IS 'Amount per checked-in guest';
COMMENT ON COLUMN public.promoter_payout_templates.per_head_min IS 'Minimum guests required for per-head payment';
COMMENT ON COLUMN public.promoter_payout_templates.per_head_max IS 'Maximum guests counted for per-head payment';
COMMENT ON COLUMN public.promoter_payout_templates.fixed_fee IS 'Fixed fee amount';
COMMENT ON COLUMN public.promoter_payout_templates.minimum_guests IS 'Minimum guests required for full fixed fee';
COMMENT ON COLUMN public.promoter_payout_templates.below_minimum_percent IS 'Percentage of fixed_fee paid if below minimum_guests (0-100)';
COMMENT ON COLUMN public.promoter_payout_templates.bonus_threshold IS 'Legacy: Number of guests required to trigger bonus';
COMMENT ON COLUMN public.promoter_payout_templates.bonus_amount IS 'Legacy: Bonus amount when threshold is met';
COMMENT ON COLUMN public.promoter_payout_templates.bonus_tiers IS 'Array of bonus tiers. Each: {threshold: number, amount: number, repeatable: boolean, label?: string}';
COMMENT ON COLUMN public.promoter_payout_templates.is_default IS 'If true, this is the default template for this organizer';

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.promoter_payout_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES
-- ============================================

-- Organizers can read their own templates
CREATE POLICY "Organizers can read their own payout templates"
  ON public.promoter_payout_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = promoter_payout_templates.organizer_id
      AND (
        o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  );

-- Organizers can insert their own templates
CREATE POLICY "Organizers can insert their own payout templates"
  ON public.promoter_payout_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = promoter_payout_templates.organizer_id
      AND (
        o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  );

-- Organizers can update their own templates
CREATE POLICY "Organizers can update their own payout templates"
  ON public.promoter_payout_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = promoter_payout_templates.organizer_id
      AND (
        o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = promoter_payout_templates.organizer_id
      AND (
        o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  );

-- Organizers can delete their own templates
CREATE POLICY "Organizers can delete their own payout templates"
  ON public.promoter_payout_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = promoter_payout_templates.organizer_id
      AND (
        o.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organizer_users ou
          WHERE ou.organizer_id = o.id
          AND ou.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_promoter_payout_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_promoter_payout_templates_updated_at
  BEFORE UPDATE ON public.promoter_payout_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_promoter_payout_templates_updated_at();

-- ============================================
-- 8. CREATE FUNCTION TO ENSURE ONE DEFAULT
-- ============================================

-- Function to unset other defaults when setting a new default
CREATE OR REPLACE FUNCTION ensure_one_default_template()
RETURNS TRIGGER AS $$
BEGIN
  -- If this template is being set as default, unset all other defaults for this organizer
  IF NEW.is_default = true THEN
    UPDATE public.promoter_payout_templates
    SET is_default = false
    WHERE organizer_id = NEW.organizer_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_one_default_template_trigger
  BEFORE INSERT OR UPDATE ON public.promoter_payout_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_one_default_template();

