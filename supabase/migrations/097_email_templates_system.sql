-- Email Template System - Database-Driven Email Management
-- Enables admin-managed email templates with variable substitution and send tracking
-- ============================================

-- ============================================
-- 1. EMAIL TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  trigger TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'auth_onboarding',
    'event_lifecycle',
    'payout',
    'bonus',
    'guest',
    'venue',
    'system'
  )),
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.email_templates IS 'Database-driven email templates with variable substitution';
COMMENT ON COLUMN public.email_templates.slug IS 'Unique identifier (e.g., promoter_welcome, event_reminder_24h)';
COMMENT ON COLUMN public.email_templates.trigger IS 'Trigger event (e.g., promoter.created, event.24h_before)';
COMMENT ON COLUMN public.email_templates.category IS 'Template category for organization';
COMMENT ON COLUMN public.email_templates.target_roles IS 'Array of roles that receive this email';
COMMENT ON COLUMN public.email_templates.variables IS 'JSON schema of available template variables';
COMMENT ON COLUMN public.email_templates.enabled IS 'Whether template is active';

-- ============================================
-- 2. EMAIL SEND LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  template_slug TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.email_send_logs IS 'Audit log of all emails sent via template system';
COMMENT ON COLUMN public.email_send_logs.template_slug IS 'Denormalized for querying even if template deleted';
COMMENT ON COLUMN public.email_send_logs.metadata IS 'Additional tracking data (Postmark message ID, etc.)';

-- ============================================
-- 3. PROMOTER ONBOARDING TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.promoter_onboarding_sent (
  promoter_id UUID PRIMARY KEY REFERENCES public.promoters(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.promoter_onboarding_sent IS 'Tracks which promoters have received welcome email (one-time only)';

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON public.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_enabled ON public.email_templates(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_trigger ON public.email_templates(trigger);

CREATE INDEX IF NOT EXISTS idx_email_send_logs_template_id ON public.email_send_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_template_slug ON public.email_send_logs(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient ON public.email_send_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_recipient_user_id ON public.email_send_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_status ON public.email_send_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_send_logs_sent_at ON public.email_send_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_promoter_onboarding_sent_promoter_id ON public.promoter_onboarding_sent(promoter_id);

-- ============================================
-- 5. ENABLE RLS
-- ============================================

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_onboarding_sent ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Email Templates: Superadmins can manage, others can read enabled templates
CREATE POLICY "Superadmins can manage email templates"
  ON public.email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Anyone can read enabled email templates"
  ON public.email_templates FOR SELECT
  USING (enabled = true);

-- Email Send Logs: Superadmins can read all, users can read their own
CREATE POLICY "Superadmins can read all email logs"
  ON public.email_send_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Users can read their own email logs"
  ON public.email_send_logs FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Promoter Onboarding: Superadmins can manage, promoters can read their own
CREATE POLICY "Superadmins can manage promoter onboarding tracking"
  ON public.promoter_onboarding_sent FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Promoters can read their own onboarding status"
  ON public.promoter_onboarding_sent FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.promoters
      WHERE id = promoter_onboarding_sent.promoter_id
      AND created_by = auth.uid()
    )
  );

-- ============================================
-- 7. HELPER FUNCTION: Get template by slug
-- ============================================

CREATE OR REPLACE FUNCTION public.get_email_template(template_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  trigger TEXT,
  category TEXT,
  target_roles TEXT[],
  subject TEXT,
  html_body TEXT,
  text_body TEXT,
  variables JSONB,
  enabled BOOLEAN
) AS $$
  SELECT 
    et.id,
    et.slug,
    et.trigger,
    et.category,
    et.target_roles,
    et.subject,
    et.html_body,
    et.text_body,
    et.variables,
    et.enabled
  FROM public.email_templates et
  WHERE et.slug = template_slug
    AND et.enabled = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_email_template IS 'Get enabled email template by slug for rendering';

