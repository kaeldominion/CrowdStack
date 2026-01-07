-- Dynamic QR Codes
-- Allows creating QR codes with unique identifiers that can point to different URLs dynamically
-- Perfect for printed QR codes that need to be reused for different events/referrers

-- ============================================
-- TABLE: dynamic_qr_codes
-- ============================================

CREATE TABLE IF NOT EXISTS public.dynamic_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Unique identifier like "venue-window-1"
  name TEXT NOT NULL, -- Human-readable description
  target_url TEXT NOT NULL, -- Current URL the QR code points to
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by code
CREATE INDEX IF NOT EXISTS idx_dynamic_qr_codes_code ON public.dynamic_qr_codes(code);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.dynamic_qr_codes ENABLE ROW LEVEL SECURITY;

-- Public can read QR codes (for redirect endpoint)
CREATE POLICY "Public can read QR codes"
  ON public.dynamic_qr_codes FOR SELECT
  USING (true);

-- Only superadmins can create, update, delete
CREATE POLICY "Superadmins can manage QR codes"
  ON public.dynamic_qr_codes FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_dynamic_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dynamic_qr_codes_updated_at
  BEFORE UPDATE ON public.dynamic_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_dynamic_qr_codes_updated_at();

