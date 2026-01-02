-- Add Photos Published Email Template
-- Migrates the hardcoded photos email to the database-driven template system
-- ============================================

-- Helper function to get first superadmin user (for created_by)
CREATE OR REPLACE FUNCTION public.get_first_superadmin()
RETURNS UUID AS $$
  SELECT ur.user_id 
  FROM public.user_roles ur
  WHERE ur.role = 'superadmin'
  ORDER BY ur.created_at
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Photos Published Email (for attendees)
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
  'photos_published',
  'photos.published',
  'event_photos',
  ARRAY['attendee'],
  'Photos from {{event_name}} are now available!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photos from {{event_name}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <img 
                src="https://crowdstack.app/logos/crowdstack-icon-tricolor-on-transparent.png" 
                alt="CrowdStack" 
                width="48" 
                height="48" 
                style="display: block; margin: 0 auto 16px auto;"
              />
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 700; margin: 0; line-height: 1.3;">
                Your photos are ready!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hey there! The photos from <strong style="color: #FFFFFF;">{{event_name}}</strong> on {{event_date}} are now available for viewing.
              </p>
              
              <div style="background: #1F2937; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                <p style="color: #E5E7EB; margin: 0; font-style: italic;">"{{custom_message}}"</p>
              </div>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 16px 0 24px 0;">
                Browse the full gallery, download your favorites, and share the memories!
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a 
                      href="{{gallery_url}}" 
                      style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;"
                    >
                      View Photos
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                If the button doesn''t work, copy and paste this link:<br/>
                <a href="{{gallery_url}}" style="color: #8B5CF6; word-break: break-all;">{{gallery_url}}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                You''re receiving this because you attended {{event_name}}.<br/>
                Powered by <a href="https://crowdstack.app" style="color: #8B5CF6; text-decoration: none;">CrowdStack</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Your photos from {{event_name}} are ready!

Hey there! The photos from {{event_name}} on {{event_date}} are now available for viewing.

Message from the organizer: "{{custom_message}}"
Browse the full gallery, download your favorites, and share the memories!

View Photos: {{gallery_url}}

---
You''re receiving this because you attended {{event_name}}.
Powered by CrowdStack - https://crowdstack.app',
  '{"event_name": "string", "event_date": "string", "venue_name": "string", "gallery_url": "string", "custom_message": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.email_templates IS 'Email templates for promoter payout system and event lifecycle. Templates can be edited via /admin/communications';

