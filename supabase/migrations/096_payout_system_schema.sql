-- Promoter Payout & Event Closeout System - Schema Migration
-- Adds currency support, enhanced promoter contracts, closeout tracking, and payment states
-- ============================================

-- ============================================
-- 1. ADD CURRENCY SUPPORT
-- ============================================

-- Add default_currency to venues (ISO code, e.g., 'IDR', 'USD', 'EUR')
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'IDR';

-- Add currency to events (locked once published)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS currency TEXT;

-- Set default currency for existing events based on venue
UPDATE public.events e
SET currency = COALESCE(
  (SELECT v.default_currency FROM public.venues v WHERE v.id = e.venue_id),
  'IDR'
)
WHERE currency IS NULL;

-- Add constraint to ensure currency is set (enforced at application level for new events)
COMMENT ON COLUMN public.events.currency IS 'ISO currency code (e.g., IDR, USD, EUR). Locked once event is published.';

-- ============================================
-- 2. ENHANCE EVENT_PROMOTERS WITH NEW PAYOUT MODEL
-- ============================================

-- Add per-head rate fields
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS per_head_rate DECIMAL(10, 2);

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS per_head_min INTEGER;

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS per_head_max INTEGER;

-- Add bonus fields
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS bonus_threshold INTEGER;

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10, 2);

-- Add fixed fee
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS fixed_fee DECIMAL(10, 2);

-- Add manual adjustment fields
ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS manual_adjustment_amount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE public.event_promoters
ADD COLUMN IF NOT EXISTS manual_adjustment_reason TEXT;

COMMENT ON COLUMN public.event_promoters.per_head_rate IS 'Amount per checked-in guest (null if not using per-head model)';
COMMENT ON COLUMN public.event_promoters.per_head_min IS 'Minimum guests required for per-head payment';
COMMENT ON COLUMN public.event_promoters.per_head_max IS 'Maximum guests counted for per-head payment';
COMMENT ON COLUMN public.event_promoters.bonus_threshold IS 'Number of guests required to trigger bonus';
COMMENT ON COLUMN public.event_promoters.bonus_amount IS 'Bonus amount when threshold is met';
COMMENT ON COLUMN public.event_promoters.fixed_fee IS 'Fixed fee amount (null if not using fixed fee model)';
COMMENT ON COLUMN public.event_promoters.manual_adjustment_amount IS 'Manual override amount (positive or negative)';
COMMENT ON COLUMN public.event_promoters.manual_adjustment_reason IS 'Reason for manual adjustment (audit trail)';

-- ============================================
-- 3. ADD EVENT CLOSEOUT FIELDS
-- ============================================

-- Add closeout tracking to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS closeout_notes TEXT;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10, 2);

-- Update status check constraint to include 'closed'
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE public.events
ADD CONSTRAINT events_status_check 
CHECK (status IN ('draft', 'published', 'ended', 'closed'));

COMMENT ON COLUMN public.events.closed_at IS 'Timestamp when event was closed and payouts finalized';
COMMENT ON COLUMN public.events.closed_by IS 'User who closed the event';
COMMENT ON COLUMN public.events.closeout_notes IS 'Optional notes from closeout process';
COMMENT ON COLUMN public.events.total_revenue IS 'Optional total event revenue (for reporting)';

-- ============================================
-- 4. ENHANCE PAYOUT_LINES WITH PAYMENT TRACKING
-- ============================================

-- Add payment status
ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending_payment'
CHECK (payment_status IN ('pending_payment', 'paid', 'confirmed'));

-- Add payment proof and tracking
ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS payment_proof_path TEXT;

ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS payment_marked_by UUID REFERENCES auth.users(id);

ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS payment_marked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.payout_lines
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

COMMENT ON COLUMN public.payout_lines.payment_status IS 'Payment state: pending_payment, paid, confirmed';
COMMENT ON COLUMN public.payout_lines.payment_proof_path IS 'Storage path to payment proof (screenshot, receipt, etc.)';
COMMENT ON COLUMN public.payout_lines.payment_marked_by IS 'User who marked payment as paid';
COMMENT ON COLUMN public.payout_lines.payment_marked_at IS 'Timestamp when payment was marked as paid';
COMMENT ON COLUMN public.payout_lines.payment_notes IS 'Optional notes about payment';

-- ============================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_events_currency ON public.events(currency);
CREATE INDEX IF NOT EXISTS idx_events_closed_at ON public.events(closed_at);
CREATE INDEX IF NOT EXISTS idx_events_status_closed ON public.events(status) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_payout_lines_payment_status ON public.payout_lines(payment_status);
CREATE INDEX IF NOT EXISTS idx_payout_lines_payment_marked_at ON public.payout_lines(payment_marked_at);

-- ============================================
-- 6. UPDATE RLS POLICIES (if needed)
-- ============================================

-- Note: Existing RLS policies should cover these new fields automatically
-- since they reference the same tables. No new policies needed unless
-- we need to restrict access to payment_proof_path or closeout_notes.

COMMENT ON TABLE public.event_promoters IS 'Enhanced with per-head, bonus, fixed fee, and manual adjustment support';
COMMENT ON TABLE public.payout_lines IS 'Enhanced with payment status tracking and proof upload';

