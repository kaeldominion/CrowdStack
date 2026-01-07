-- QR Code Scan Tracking
-- Track scans/redirects for dynamic QR codes

-- Create table to track QR code scans
CREATE TABLE IF NOT EXISTS public.qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES public.dynamic_qr_codes(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT
);

-- Index for fast lookups by QR code
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code_id ON public.qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_scanned_at ON public.qr_code_scans(scanned_at);

-- RLS Policies - only superadmins, organizers, and venues can read their own scans
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- Public can insert scans (for the redirect endpoint)
CREATE POLICY "Public can insert scans"
  ON public.qr_code_scans FOR INSERT
  WITH CHECK (true);

-- Superadmins can read all scans
CREATE POLICY "Superadmins can read all scans"
  ON public.qr_code_scans FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

-- Organizers can read scans for their QR codes
CREATE POLICY "Organizers can read their QR code scans"
  ON public.qr_code_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dynamic_qr_codes dqc
      WHERE dqc.id = qr_code_scans.qr_code_id
      AND dqc.organizer_id IN (
        SELECT ou.organizer_id
        FROM public.organizer_users ou
        WHERE ou.user_id = auth.uid()
        UNION
        SELECT o.id
        FROM public.organizers o
        WHERE o.created_by = auth.uid()
      )
    )
  );

-- Venues can read scans for their QR codes
CREATE POLICY "Venues can read their QR code scans"
  ON public.qr_code_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dynamic_qr_codes dqc
      WHERE dqc.id = qr_code_scans.qr_code_id
      AND dqc.venue_id IN (
        SELECT vu.venue_id
        FROM public.venue_users vu
        WHERE vu.user_id = auth.uid()
        UNION
        SELECT v.id
        FROM public.venues v
        WHERE v.created_by = auth.uid()
      )
    )
  );

