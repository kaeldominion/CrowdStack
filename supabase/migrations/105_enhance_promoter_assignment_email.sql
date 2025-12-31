-- Enhance promoter_event_assigned email template with event details, venue, flier, referral link, and QR code info
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Event Assignment</title>
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
                New Event Assignment
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{promoter_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You''ve been assigned to promote <strong style="color: #FFFFFF;">{{event_name}}</strong>!
              </p>
              
              <!-- Event Flier Image -->
              <div style="margin: 20px 0; text-align: center;">
                <img 
                  src="{{flier_image_url}}" 
                  alt="{{event_name}}" 
                  style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);"
                />
              </div>
              
              <!-- Event Details Card -->
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #E5E7EB;"><strong style="color: #FFFFFF;">Event:</strong> {{event_name}}</p>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #E5E7EB;"><strong style="color: #FFFFFF;">Date & Time:</strong> {{event_time_full}}</p>
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #E5E7EB;"><strong style="color: #FFFFFF;">Venue:</strong> {{venue_address}}</p>
                <p style="margin: 12px 0 0 0; font-size: 14px; color: #E5E7EB; line-height: 1.5;">{{event_description}}</p>
              </div>
              
              <!-- Payout Terms -->
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #E5E7EB;"><strong style="color: #FFFFFF;">Payout Terms:</strong></p>
                <div style="margin-top: 8px; padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 6px; border-left: 3px solid #8B5CF6;">
                  <p style="margin: 0; font-size: 14px; color: #E5E7EB; white-space: pre-line; line-height: 1.8;">{{payout_terms}}</p>
                </div>
              </div>
              
              <!-- Referral Link Section -->
              <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(139, 92, 246, 0.3);">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #FFFFFF; font-weight: 600;">Your Shareable Referral Link:</p>
                <div style="background: #0B0D10; padding: 12px; border-radius: 6px; margin: 8px 0; word-break: break-all;">
                  <a href="{{referral_link}}" style="color: #8B5CF6; text-decoration: none; font-size: 13px; font-family: monospace;">{{referral_link}}</a>
                </div>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                  Share this link to track your referrals. Want a QR code? <a href="{{dashboard_url}}" style="color: #8B5CF6; text-decoration: underline;">Login to your dashboard</a> to generate one.
                </p>
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Start promoting now to maximize your earnings!
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Event Dashboard</a>
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
</html>'
WHERE slug = 'promoter_event_assigned';

-- Update text_body as well
UPDATE public.email_templates
SET text_body = 'Hi {{promoter_name}},

You''ve been assigned to promote {{event_name}}!

Event Details:
- Date & Time: {{event_time_full}}
- Venue: {{venue_address}}
{{#if event_description}}
- Description: {{event_description}}
{{/if}}

Payout Terms:
{{payout_terms}}

Your Shareable Referral Link:
{{referral_link}}

Share this link to track your referrals. Want a QR code? Login to your dashboard at {{dashboard_url}} to generate one.

View Event Dashboard: {{dashboard_url}}

Your Shareable Referral Link:
{{referral_link}}

Share this link to track your referrals. Want a QR code? Login to your dashboard at {{dashboard_url}} to generate one.

View Event Dashboard: {{dashboard_url}}

Best regards,
The CrowdStack Team'
WHERE slug = 'promoter_event_assigned';

-- Update variables list
UPDATE public.email_templates
SET variables = '{"promoter_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "event_time_full": "string", "event_description": "string", "venue_name": "string", "venue_address": "string", "flier_image_url": "string", "referral_link": "string", "dashboard_url": "string", "payout_terms": "string", "currency": "string"}'::jsonb
WHERE slug = 'promoter_event_assigned';

COMMENT ON COLUMN public.email_templates.html_body IS 'HTML body template with {{variable}} placeholders. Enhanced with event details, venue, flier image, referral link, and QR code dashboard link.';

