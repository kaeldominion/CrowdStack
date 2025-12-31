-- Impersonation Logs Table
-- Tracks when superadmins impersonate other users for audit purposes

CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_email TEXT,
  action TEXT NOT NULL CHECK (action IN ('start', 'end')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by admin or target
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin ON public.impersonation_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_target ON public.impersonation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_created ON public.impersonation_logs(created_at DESC);

-- RLS: Only superadmins can view impersonation logs
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view impersonation logs"
  ON public.impersonation_logs FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can insert impersonation logs"
  ON public.impersonation_logs FOR INSERT
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.impersonation_logs IS 'Audit log for admin impersonation sessions';

