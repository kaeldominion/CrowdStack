-- Add venue email templates and bonus notification tracking
-- Fixes critical bug where venue approval emails were not being sent
-- Also adds persistent storage for bonus notification state
-- ============================================

-- ============================================
-- BONUS NOTIFICATION TRACKING TABLE
-- ============================================
-- Replaces in-memory cache to prevent duplicate notifications across server restarts

CREATE TABLE IF NOT EXISTS public.bonus_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('80_percent', '100_percent')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promoter_id, event_id, notification_type)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_bonus_notifications_promoter_event
  ON public.bonus_notifications_sent(promoter_id, event_id);

-- RLS policies
ALTER TABLE public.bonus_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Service role can insert/read
CREATE POLICY "Service role can manage bonus notifications"
  ON public.bonus_notifications_sent
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VENUE EMAIL TEMPLATES
-- ============================================

-- Venue Approval Request Email
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled,
  created_by
) VALUES (
  'venue_approval_request',
  'event.venue_approval_requested',
  'venue',
  ARRAY['venue_admin'],
  '[Action Required] Event Approval Request: {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Approval Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">New Event Pending Approval</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello {{venue_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>{{organizer_name}}</strong> would like to host an event at your venue:
    </p>

    <div style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Event:</strong> {{event_name}}</p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;"><strong>Date:</strong> {{event_date}}</p>
      <p style="margin: 0; font-size: 14px; color: #666;"><strong>Organizer:</strong> {{organizer_name}}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Please review and approve or reject this event request.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{approval_link}}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Event</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'New Event Pending Approval

Hello {{venue_name}},

{{organizer_name}} would like to host an event at your venue:

Event: {{event_name}}
Date: {{event_date}}
Organizer: {{organizer_name}}

Please review and approve or reject this event at: {{approval_link}}

Best regards,
The CrowdStack Team',
  '{"venue_name": "string", "organizer_name": "string", "event_name": "string", "event_date": "string", "approval_link": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Event Approved Email (to organizer)
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled,
  created_by
) VALUES (
  'event_approved',
  'event.approved',
  'venue',
  ARRAY['organizer'],
  'Good News! Your event "{{event_name}}" has been approved',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Event Approved!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello {{organizer_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! <strong>{{venue_name}}</strong> has approved your event:
    </p>

    <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #155724;">{{event_name}}</p>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You can now publish your event and start promoting it to your audience.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{event_link}}" style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Event</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Event Approved!

Hello {{organizer_name}},

Great news! {{venue_name}} has approved your event:

Event: {{event_name}}

You can now publish your event and start promoting it to your audience.

View Event: {{event_link}}

Best regards,
The CrowdStack Team',
  '{"organizer_name": "string", "venue_name": "string", "event_name": "string", "event_link": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Event Rejected Email (to organizer)
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled,
  created_by
) VALUES (
  'event_rejected',
  'event.rejected',
  'venue',
  ARRAY['organizer'],
  'Update: Your event "{{event_name}}" was not approved',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Not Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Event Not Approved</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello {{organizer_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Unfortunately, <strong>{{venue_name}}</strong> has not approved your event:
    </p>

    <div style="background: #f8d7da; padding: 20px; border-left: 4px solid #dc3545; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600; color: #721c24;">{{event_name}}</p>
      {{#if rejection_reason}}
      <p style="margin: 0; font-size: 14px; color: #721c24;"><strong>Reason:</strong> {{rejection_reason}}</p>
      {{/if}}
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You can edit your event and try a different venue, or contact the venue directly to discuss.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{event_link}}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Edit Event</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Event Not Approved

Hello {{organizer_name}},

Unfortunately, {{venue_name}} has not approved your event:

Event: {{event_name}}
{{#if rejection_reason}}
Reason: {{rejection_reason}}
{{/if}}

You can edit your event and try a different venue, or contact the venue directly.

Edit Event: {{event_link}}

Best regards,
The CrowdStack Team',
  '{"organizer_name": "string", "venue_name": "string", "event_name": "string", "event_link": "string", "rejection_reason": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.bonus_notifications_sent IS 'Tracks which bonus milestone notifications have been sent to prevent duplicates';

-- ============================================
-- HELPER FUNCTION: Get users by IDs
-- ============================================
-- Required for email notifications to look up user emails

CREATE OR REPLACE FUNCTION public.get_users_by_ids(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.raw_user_meta_data
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to service role only
REVOKE ALL ON FUNCTION public.get_users_by_ids(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_users_by_ids(UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_users_by_ids(UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_by_ids(UUID[]) TO service_role;

COMMENT ON FUNCTION public.get_users_by_ids IS
'Retrieves user information (id, email, metadata) for a list of user IDs.
Only callable by service_role for security. Used by notification email system.';
