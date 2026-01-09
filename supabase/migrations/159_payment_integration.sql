-- ============================================================================
-- DOKU Payment Integration
-- Enables venues to accept payments via DOKU gateway for table bookings
-- (and later ticket sales)
-- ============================================================================

-- ============================================================================
-- 1. VENUE PAYMENT SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venue_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE UNIQUE,

  -- DOKU Configuration
  doku_enabled BOOLEAN DEFAULT FALSE,
  doku_client_id TEXT,  -- Will be encrypted at application level
  doku_secret_key TEXT,  -- Will be encrypted at application level
  doku_environment TEXT DEFAULT 'sandbox' CHECK (doku_environment IN ('sandbox', 'production')),

  -- Fallback for manual payments
  manual_payment_enabled BOOLEAN DEFAULT TRUE,
  manual_payment_instructions TEXT,

  -- Settings
  auto_confirm_on_payment BOOLEAN DEFAULT TRUE,
  payment_expiry_hours INTEGER DEFAULT 24,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  configured_by UUID REFERENCES auth.users(id),
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT  -- 'success' or error message
);

CREATE INDEX IF NOT EXISTS idx_venue_payment_settings_venue_id ON public.venue_payment_settings(venue_id);

-- Trigger for updated_at
CREATE TRIGGER set_venue_payment_settings_updated_at
  BEFORE UPDATE ON public.venue_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. PAYMENT TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,

  -- Link to bookable item (table booking now, tickets later)
  reference_type TEXT NOT NULL CHECK (reference_type IN ('table_booking', 'ticket')),
  reference_id UUID NOT NULL,

  -- Payment details
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',

  -- DOKU specific
  doku_invoice_id TEXT,
  doku_payment_id TEXT,
  doku_payment_url TEXT,
  doku_payment_method TEXT,
  doku_va_number TEXT,
  doku_qr_code TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'expired',
    'refunded',
    'cancelled'
  )),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Webhook data
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  webhook_payload JSONB,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_venue_id ON public.payment_transactions(venue_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_doku_invoice ON public.payment_transactions(doku_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER set_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. UPDATE TABLE BOOKINGS WITH PAYMENT FIELDS
-- ============================================================================
ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.payment_transactions(id),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required' CHECK (payment_status IN (
  'not_required',
  'pending',
  'paid',
  'refunded',
  'waived'
));

CREATE INDEX IF NOT EXISTS idx_table_bookings_payment_status ON public.table_bookings(payment_status);

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE public.venue_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Venue Payment Settings Policies

-- Superadmins can manage all
CREATE POLICY "Superadmins can manage all payment settings"
  ON public.venue_payment_settings FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue staff can manage their venue's settings
CREATE POLICY "Venue staff can manage own payment settings"
  ON public.venue_payment_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_payment_settings.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_payment_settings.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Payment Transactions Policies

-- Superadmins can view all transactions
CREATE POLICY "Superadmins can view all payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue staff can view their venue's transactions
CREATE POLICY "Venue staff can view own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = payment_transactions.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Service role can insert/update transactions (for webhooks)
CREATE POLICY "Service can manage payment transactions"
  ON public.payment_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. HELPER FUNCTION: Get venue payment settings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_venue_payment_settings(p_venue_id UUID)
RETURNS TABLE (
  id UUID,
  venue_id UUID,
  doku_enabled BOOLEAN,
  doku_environment TEXT,
  manual_payment_enabled BOOLEAN,
  manual_payment_instructions TEXT,
  auto_confirm_on_payment BOOLEAN,
  payment_expiry_hours INTEGER,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT
) AS $$
  SELECT
    vps.id,
    vps.venue_id,
    vps.doku_enabled,
    vps.doku_environment,
    vps.manual_payment_enabled,
    vps.manual_payment_instructions,
    vps.auto_confirm_on_payment,
    vps.payment_expiry_hours,
    vps.last_tested_at,
    vps.last_test_status
  FROM public.venue_payment_settings vps
  WHERE vps.venue_id = p_venue_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_venue_payment_settings IS 'Get payment settings for a venue (excludes sensitive credentials)';
