-- DJ Gig Email Templates
-- Following the dark mode design pattern from existing templates
-- ============================================

-- 1. DJ Gig Invitation Email
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled
) VALUES (
  'dj_gig_invitation',
  'dj_gig.invited',
  'event_lifecycle',
  ARRAY['dj'],
  '🎧 New Gig Invitation: {{gig_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gig Invitation</title>
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
                🎧 New Gig Invitation
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{dj_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong style="color: #FFFFFF;">{{organizer_name}}</strong> has invited you to perform at:
              </p>
              
              <div style="background: rgba(139, 92, 246, 0.1); padding: 24px; border-left: 4px solid #8B5CF6; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">{{gig_title}}</h2>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Event:</strong> {{event_name}}</p>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Date:</strong> {{event_date}}</p>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if payment_amount}}
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Payment:</strong> <span style="color: #10B981; font-weight: 600;">{{payment_amount}} {{payment_currency}}</span></p>
                {{/if}}
              </div>
              
              {{#if gig_description}}
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                {{gig_description}}
              </p>
              {{/if}}
              
              {{#if deadline}}
              <p style="color: #FFC107; font-size: 14px; margin: 20px 0;">
                ⏰ Please respond by {{deadline}}
              </p>
              {{/if}}
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{gig_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Gig Details</a>
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
  'New Gig Invitation

Hi {{dj_name}},

{{organizer_name}} has invited you to perform at:

{{gig_title}}
Event: {{event_name}}
Date: {{event_date}}
Venue: {{venue_name}}
{{#if payment_amount}}Payment: {{payment_amount}} {{payment_currency}}{{/if}}

{{#if gig_description}}{{gig_description}}{{/if}}

{{#if deadline}}Please respond by {{deadline}}{{/if}}

View gig: {{gig_url}}',
  '{"dj_name": "string", "organizer_name": "string", "gig_title": "string", "event_name": "string", "event_date": "string", "venue_name": "string", "payment_amount": "number", "payment_currency": "string", "gig_description": "string", "deadline": "string", "gig_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 2. DJ Gig Confirmation Email
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled
) VALUES (
  'dj_gig_confirmed',
  'dj_gig.confirmed',
  'event_lifecycle',
  ARRAY['dj'],
  '✅ Gig Confirmed: {{gig_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gig Confirmed</title>
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
                ✅ Gig Confirmed!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{dj_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! <strong style="color: #FFFFFF;">{{organizer_name}}</strong> has selected you for:
              </p>
              
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">{{gig_title}}</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Event:</strong> {{event_name}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Date:</strong> {{event_date}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if payment_amount}}
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Payment:</strong> <span style="font-weight: 700;">{{payment_amount}} {{payment_currency}}</span></p>
                {{/if}}
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                You''ve been added to the event lineup. The organizer will be in touch with further details.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{event_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Event</a>
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
  'Gig Confirmed!

Hi {{dj_name}},

Congratulations! {{organizer_name}} has selected you for:

{{gig_title}}
Event: {{event_name}}
Date: {{event_date}}
Venue: {{venue_name}}
{{#if payment_amount}}Payment: {{payment_amount}} {{payment_currency}}{{/if}}

View event: {{event_url}}',
  '{"dj_name": "string", "organizer_name": "string", "gig_title": "string", "event_name": "string", "event_date": "string", "venue_name": "string", "payment_amount": "number", "payment_currency": "string", "event_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 3. DJ Gig Reminder - 1 Day Before
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled
) VALUES (
  'dj_gig_reminder_24h',
  'dj_gig.24h_before',
  'event_lifecycle',
  ARRAY['dj'],
  '⏰ Reminder: Your gig is tomorrow - {{gig_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gig Reminder</title>
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
                ⏰ Gig Tomorrow!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{dj_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is a friendly reminder that your gig is <strong style="color: #FFC107;">tomorrow</strong>:
              </p>
              
              <div style="background: rgba(255, 193, 7, 0.1); padding: 24px; border-left: 4px solid #FFC107; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">{{gig_title}}</h2>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Event:</strong> {{event_name}}</p>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Date & Time:</strong> {{event_date}} at {{event_time}}</p>
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if venue_address}}
                <p style="color: #E5E7EB; font-size: 14px; margin: 8px 0;"><strong>Address:</strong> {{venue_address}}</p>
                {{/if}}
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Make sure you''re prepared and have all the details you need. See you there! 🎧
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{event_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Event Details</a>
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
  'Gig Reminder - Tomorrow

Hi {{dj_name}},

This is a reminder that your gig is tomorrow:

{{gig_title}}
Event: {{event_name}}
Date & Time: {{event_date}} at {{event_time}}
Venue: {{venue_name}}
{{#if venue_address}}Address: {{venue_address}}{{/if}}

View event: {{event_url}}',
  '{"dj_name": "string", "gig_title": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "event_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 4. DJ Gig Reminder - 4 Hours Before
INSERT INTO public.email_templates (
  slug,
  trigger,
  category,
  target_roles,
  subject,
  html_body,
  text_body,
  variables,
  enabled
) VALUES (
  'dj_gig_reminder_4h',
  'dj_gig.4h_before',
  'event_lifecycle',
  ARRAY['dj'],
  '🚀 Final Reminder: Your gig starts in 4 hours - {{gig_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Final Gig Reminder</title>
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
                🚀 Final Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{dj_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your gig starts in <strong style="color: #10B981;">4 hours</strong>! Here are the details:
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">{{gig_title}}</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Event:</strong> {{event_name}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Start Time:</strong> {{event_date}} at {{event_time}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if venue_address}}
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Address:</strong> {{venue_address}}</p>
                {{/if}}
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Time to get ready! See you at the venue. 🎧
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
  'Final Reminder - 4 Hours

Hi {{dj_name}},

Your gig starts in 4 hours!

{{gig_title}}
Event: {{event_name}}
Start Time: {{event_date}} at {{event_time}}
Venue: {{venue_name}}
{{#if venue_address}}Address: {{venue_address}}{{/if}}

View event: {{event_url}}',
  '{"dj_name": "string", "gig_title": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "event_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

