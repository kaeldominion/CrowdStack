-- Update All Email Templates with CrowdStack Branding
-- Applies consistent dark mode design with logo to all email templates
-- ============================================

-- ============================================
-- 1. VENUE PULSE / FEEDBACK REQUEST EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your experience?</title>
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
                Thanks for attending! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi{{attendee_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thanks for attending <strong style="color: #FFFFFF;">{{event_name}}</strong>{{venue_name}}.
              </p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                How was your experience? We''d love to hear your feedback.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{feedback_link}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Share Your Feedback</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                This link will expire in 7 days.
              </p>
              
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
                This email was sent by CrowdStack, not the venue.<br>
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
updated_at = NOW()
WHERE slug = 'feedback_request';

-- ============================================
-- 2. VENUE APPROVAL REQUEST EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Approval Request</title>
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
                New Event Pending Approval
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello {{venue_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong style="color: #FFFFFF;">{{organizer_name}}</strong> would like to host an event at your venue:
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0; font-size: 16px; color: #FFFFFF; font-weight: 600;">{{event_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #9CA3AF;">Date: {{event_date}}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #9CA3AF;">Organizer: {{organizer_name}}</p>
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Please review and approve or reject this event request.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{approval_link}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Review Event</a>
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
updated_at = NOW()
WHERE slug = 'venue_approval_request';

-- ============================================
-- 3. VENUE EVENT APPROVED EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Approved</title>
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
                ✅ Event Approved!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello {{organizer_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! <strong style="color: #FFFFFF;">{{venue_name}}</strong> has approved your event:
              </p>
              
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; color: #FFFFFF; font-weight: 600;">{{event_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">{{event_date}}</p>
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your event is now confirmed. You can start promoting and managing your event.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Event</a>
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
updated_at = NOW()
WHERE slug = 'venue_event_approved';

-- ============================================
-- 4. VENUE EVENT REJECTED EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Not Approved</title>
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
                Event Not Approved
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello {{organizer_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Unfortunately, <strong style="color: #FFFFFF;">{{venue_name}}</strong> was unable to approve your event request:
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                <p style="margin: 0; font-size: 16px; color: #FFFFFF; font-weight: 600;">{{event_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #9CA3AF;">{{event_date}}</p>
              </div>
              
              {{#rejection_reason}}
              <div style="background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #FCA5A5;"><strong>Reason:</strong></p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #E5E7EB;">{{rejection_reason}}</p>
              </div>
              {{/rejection_reason}}
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You may wish to contact the venue directly or try another venue for your event.
              </p>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{dashboard_link}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Go to Dashboard</a>
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
updated_at = NOW()
WHERE slug = 'venue_event_rejected';

-- ============================================
-- 5. TABLE BOOKING REQUEST EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Booking Request</title>
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
                Table Booking Request Received
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your table booking request has been received for <strong style="color: #FFFFFF;">{{event_name}}</strong>.
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #FFFFFF; font-size: 16px;">Booking Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Event</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Date</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Table</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{table_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Zone</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{zone_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Party Size</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{party_size}} guests</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Minimum Spend</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{currency_symbol}}{{minimum_spend}}</td>
                  </tr>
                </table>
              </div>
              
              {{#deposit_required}}
              <div style="background: rgba(251, 191, 36, 0.1); padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FBBF24;">
                <p style="margin: 0; font-size: 14px; color: #FCD34D;">
                  <strong>Deposit Required:</strong> {{currency_symbol}}{{deposit_amount}}<br>
                  {{deposit_instructions}}
                </p>
              </div>
              {{/deposit_required}}
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We will contact you shortly via WhatsApp to confirm your booking.
              </p>
              
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
updated_at = NOW()
WHERE slug = 'table_booking_request';

-- ============================================
-- 6. TABLE BOOKING CONFIRMED EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
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
                ✅ Booking Confirmed!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your table booking for <strong style="color: #FFFFFF;">{{event_name}}</strong> has been confirmed.
              </p>
              
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">Your Table</p>
                <p style="margin: 10px 0 0 0; font-size: 28px; font-weight: bold; color: #FFFFFF;">{{table_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">{{zone_name}}</p>
              </div>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #FFFFFF; font-size: 16px;">Event Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Event</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Date</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Party Size</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{party_size}} guests</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Minimum Spend</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{currency_symbol}}{{minimum_spend}}</td>
                  </tr>
                </table>
              </div>
              
              {{#qr_code_url}}
              <div style="text-align: center; margin: 30px 0; padding: 20px; background: #FFFFFF; border-radius: 12px;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; font-weight: 600;">Your Entry QR Code</p>
                <img src="{{qr_code_url}}" alt="Entry QR Code" style="width: 200px; height: 200px;" />
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">Show this at the door for entry</p>
              </div>
              {{/qr_code_url}}
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{booking_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Booking</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                See you there!<br>
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
updated_at = NOW()
WHERE slug = 'table_booking_confirmed';

-- ============================================
-- 7. TABLE PARTY INVITE EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Party Invite</title>
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
                🎉 You''re Invited!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong style="color: #FFFFFF;">{{host_name}}</strong> has invited you to join their table at <strong style="color: #FFFFFF;">{{event_name}}</strong>.
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #FFFFFF; font-size: 16px;">Event Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Event</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Date</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Venue</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{venue_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Table</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{table_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Party Size</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{party_size}} guests</td>
                  </tr>
                </table>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{join_url}}" style="display: inline-block; background: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Join the Party</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                Click the button above to confirm your spot and get your personal QR code for entry.
              </p>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                See you there!<br>
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
updated_at = NOW()
WHERE slug = 'table_party_invite';

-- ============================================
-- 8. TABLE PARTY JOINED EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Table Pass</title>
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
                ✅ You''re In!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You''ve joined <strong style="color: #FFFFFF;">{{host_name}}</strong>''s table at <strong style="color: #FFFFFF;">{{event_name}}</strong>!
              </p>
              
              <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">Your Table</p>
                <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #FFFFFF;">{{table_name}}</p>
              </div>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #FFFFFF; font-size: 16px;">Event Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Event</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Date</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_date}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Time</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_time}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Venue</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{venue_name}}</td>
                  </tr>
                </table>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{pass_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Your Pass</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                Show your QR code at the door for entry. Make sure to arrive on time!
              </p>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                See you there!<br>
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
updated_at = NOW()
WHERE slug = 'table_party_joined';

-- ============================================
-- 9. TABLE BOOKING ARRIVAL REMINDER EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Arrival Reminder</title>
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
                ⏰ Your Table is Waiting!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your table at <strong style="color: #FFFFFF;">{{event_name}}</strong> is waiting for you!
              </p>
              
              <div style="background: rgba(251, 191, 36, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FBBF24; text-align: center;">
                <p style="margin: 0; font-size: 16px; color: #FCD34D; font-weight: 600;">
                  Please arrive by {{arrival_deadline}}
                </p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #9CA3AF;">
                  to keep your reservation
                </p>
              </div>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #FFFFFF; font-size: 16px;">Your Reservation</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Event</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{event_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Table</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{table_name}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #9CA3AF;">Venue</td>
                    <td style="padding: 8px 0; text-align: right; color: #FFFFFF; font-weight: 600;">{{venue_name}}</td>
                  </tr>
                </table>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{booking_url}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">View Booking</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                See you soon!<br>
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
updated_at = NOW()
WHERE slug = 'table_booking_arrival_reminder';

-- ============================================
-- 10. TABLE BOOKING CANCELLED BY VENUE EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
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
                Booking Cancelled
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We''re sorry to inform you that your table booking for <strong style="color: #FFFFFF;">{{event_name}}</strong> has been cancelled by the venue.
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
                <p style="margin: 0; font-size: 16px; color: #FFFFFF; font-weight: 600;">{{table_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #9CA3AF;">{{event_date}}</p>
              </div>
              
              {{#cancellation_reason}}
              <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #FCA5A5;"><strong>Reason:</strong></p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #E5E7EB;">{{cancellation_reason}}</p>
              </div>
              {{/cancellation_reason}}
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                If you have any questions, please contact the venue directly.
              </p>
              
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
updated_at = NOW()
WHERE slug = 'table_booking_cancelled_by_venue';

-- ============================================
-- 11. TABLE BOOKING NO-SHOW EMAIL
-- ============================================

UPDATE public.email_templates
SET html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Marked as No-Show</title>
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
                Booking Marked as No-Show
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{guest_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your table booking for <strong style="color: #FFFFFF;">{{event_name}}</strong> has been marked as a no-show as you did not arrive by the deadline.
              </p>
              
              <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <p style="margin: 0; font-size: 16px; color: #FFFFFF; font-weight: 600;">{{table_name}}</p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #9CA3AF;">Arrival deadline was: {{arrival_deadline}}</p>
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                If you believe this was a mistake, please contact the venue directly.
              </p>
              
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
updated_at = NOW()
WHERE slug = 'table_booking_noshow';

-- ============================================
-- COMMENT
-- ============================================

COMMENT ON TABLE public.email_templates IS 'All email templates updated with consistent CrowdStack dark mode branding and logo. Templates can be edited via /admin/communications';
