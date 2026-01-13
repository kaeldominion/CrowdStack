-- Migration: Add table party guest removed email template
-- Purpose: Notify guests when they are removed from a table party by the host
-- Fixed: Using correct column names for email_templates table

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
  created_at,
  updated_at
) VALUES (
  'table_party_guest_removed',
  'table_party.guest_removed',
  'guest',
  ARRAY['guest'],
  'Your table reservation has been updated',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Reservation Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 24px; overflow: hidden;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 24px 16px 24px;">
              <img src="https://crowdstack.app/logo-full.png" alt="CrowdStack" width="140" style="display: block; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 16px 32px 32px 32px;">

              <!-- Greeting -->
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #f8fafc; text-align: center;">
                Hi {{guest_name}},
              </p>

              <!-- Message -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; color: #94a3b8; line-height: 1.6; text-align: center;">
                  We''re writing to let you know that <strong style="color: #f8fafc;">{{host_name}}</strong> has updated the guest list for their table at <strong style="color: #f8fafc;">{{event_name}}</strong>.
                </p>
                <p style="margin: 16px 0 0 0; font-size: 15px; color: #94a3b8; line-height: 1.6; text-align: center;">
                  Unfortunately, your spot on the table has been removed.
                </p>
              </div>

              <!-- Venue Info -->
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                  Venue
                </p>
                <p style="margin: 4px 0 0 0; font-size: 16px; color: #f8fafc;">
                  {{venue_name}}
                </p>
              </div>

              <!-- Help Text -->
              <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center; line-height: 1.6;">
                If you believe this was a mistake, please contact the table host directly.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center;">
                Sent with 💜 by <a href="https://crowdstack.app" style="color: #8b5cf6; text-decoration: none;">CrowdStack</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Hi {{guest_name}},

We''re writing to let you know that {{host_name}} has updated the guest list for their table at {{event_name}}.

Unfortunately, your spot on the table has been removed.

Venue: {{venue_name}}

If you believe this was a mistake, please contact the table host directly.

- The CrowdStack Team',
  '{"guest_name": "string", "event_name": "string", "host_name": "string", "venue_name": "string"}'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  trigger = EXCLUDED.trigger,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

COMMENT ON TABLE public.email_templates IS 'Email templates for the platform - updated with table_party_guest_removed template';
