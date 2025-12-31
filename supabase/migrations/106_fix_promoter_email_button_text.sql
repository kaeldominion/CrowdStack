-- Fix promoter_event_assigned email template: Change "View Event Dashboard" to "View Promoter Dashboard"
-- ============================================

UPDATE public.email_templates
SET html_body = REPLACE(
  html_body,
  '>View Event Dashboard</a>',
  '>View Promoter Dashboard</a>'
)
WHERE slug = 'promoter_event_assigned';

UPDATE public.email_templates
SET text_body = REPLACE(
  text_body,
  'View Event Dashboard:',
  'View Promoter Dashboard:'
)
WHERE slug = 'promoter_event_assigned';

COMMENT ON TABLE public.email_templates IS 'Email templates for automated notifications. Updated promoter_event_assigned to correctly reference Promoter Dashboard.';

