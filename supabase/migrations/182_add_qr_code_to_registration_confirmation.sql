-- Migration: Add QR code to registration confirmation email
-- This updates the registration_confirmation email template to include the QR code for entry

UPDATE public.email_templates
SET 
  html_body = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You''re Registered!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #111111; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%);">
              <p style="margin: 0 0 8px 0; font-size: 32px;">🎟️</p>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF;">You''re Registered!</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{attendee_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You''re all set! We''ve confirmed your registration for <strong style="color: #FFFFFF;">{{event_name}}</strong>.
              </p>
              
              <!-- Flier Image -->
              {{flier_html}}
              
              <!-- Event Details Card -->
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">Event Details</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Date:</strong> {{event_date}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Time:</strong> {{event_time}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{venue_address_html}}
              </div>
              
              <!-- Important Info Section -->
              {{important_info_html}}
              
              <!-- QR Code Section -->
              {{qr_code_html}}
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                We''ll send you a reminder 6 hours before the event. See you there! 🎉
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{event_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Event</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                Best regards,<br>
                The CrowdStack Team
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #6B7280; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
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
  text_body = 'You''re Registered!

Hi {{attendee_name}},

You''re all set! We''ve confirmed your registration for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue_name}}
{{venue_address_text}}
{{google_maps_url}}

{{important_info_text}}

Your Entry Pass:
Show your QR code at the door for entry. View your full pass online: {{qr_pass_url}}

We''ll send you a reminder 6 hours before the event. See you there!

View event: {{event_url}}

Best regards,
The CrowdStack Team',
  variables = '{"attendee_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address_html": "string", "venue_address_text": "string", "google_maps_url": "string", "event_url": "string", "flier_html": "string", "important_info_html": "string", "important_info_text": "string", "qr_code_html": "string", "qr_code_url": "string", "qr_pass_url": "string"}'::jsonb,
  updated_at = NOW()
WHERE slug = 'registration_confirmation';
