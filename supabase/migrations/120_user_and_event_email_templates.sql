-- User and Event Email Templates
-- Following the dark mode design pattern from existing templates
-- ============================================

-- 1. Welcome Email (General Platform Welcome)
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
  'welcome',
  'user.signup',
  'auth_onboarding',
  ARRAY[]::user_role[],
  'Welcome to CrowdStack! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CrowdStack</title>
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
                Welcome to CrowdStack! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{user_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Welcome to CrowdStack! We''re excited to have you join our community of event organizers, venues, promoters, and attendees.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">What is CrowdStack?</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6; margin: 8px 0;">
                  CrowdStack is the all-in-one platform for managing events, from planning to execution. Whether you''re organizing events, managing a venue, promoting shows, or attending them, we''ve got you covered.
                </p>
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                <strong style="color: #FFFFFF;">What you can do:</strong>
              </p>
              
              <ul style="color: #E5E7EB; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>Discover and register for amazing events</li>
                <li>Manage your event registrations and check-ins</li>
                <li>Access event photos and memories</li>
                <li>Connect with venues, organizers, and promoters</li>
              </ul>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Get Started</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9CA3AF; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                If you have any questions, feel free to reach out to our support team.<br><br>
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
  'Welcome to CrowdStack!

Hi {{user_name}},

Welcome to CrowdStack! We''re excited to have you join our community.

What is CrowdStack?
CrowdStack is the all-in-one platform for managing events, from planning to execution.

What you can do:
- Discover and register for amazing events
- Manage your event registrations and check-ins
- Access event photos and memories
- Connect with venues, organizers, and promoters

Get started: {{app_url}}

Best regards,
The CrowdStack Team',
  '{"user_name": "string", "app_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 2. Venue Admin Welcome Email
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
  'venue_admin_welcome',
  'role.assigned',
  'auth_onboarding',
  ARRAY['venue_admin']::user_role[],
  'Welcome to CrowdStack - Venue Admin Access Confirmed 🏢',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Venue Admin Welcome</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                🏢 Venue Admin Access Confirmed
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{user_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! You''ve been granted <strong style="color: #10B981;">Venue Admin</strong> access for <strong style="color: #FFFFFF;">{{venue_name}}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">What You Can Do:</h2>
                <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
                  <li>Approve or reject events at your venue</li>
                  <li>Manage venue details and settings</li>
                  <li>View event analytics and attendance</li>
                  <li>Manage your venue team members</li>
                  <li>Access door staff tools for check-ins</li>
                </ul>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{venue_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Go to Venue Dashboard</a>
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
  'Venue Admin Access Confirmed

Hi {{user_name}},

Congratulations! You''ve been granted Venue Admin access for {{venue_name}}.

What You Can Do:
- Approve or reject events at your venue
- Manage venue details and settings
- View event analytics and attendance
- Manage your venue team members
- Access door staff tools for check-ins

Go to Venue Dashboard: {{venue_dashboard_url}}

Best regards,
The CrowdStack Team',
  '{"user_name": "string", "venue_name": "string", "venue_dashboard_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 3. Event Organizer Welcome Email
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
  'event_organizer_welcome',
  'role.assigned',
  'auth_onboarding',
  ARRAY['event_organizer']::user_role[],
  'Welcome to CrowdStack - Event Organizer Access Confirmed 🎪',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Organizer Welcome</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                🎪 Event Organizer Access Confirmed
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{user_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! You''ve been granted <strong style="color: #10B981;">Event Organizer</strong> access for <strong style="color: #FFFFFF;">{{organizer_name}}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">What You Can Do:</h2>
                <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
                  <li>Create and manage events</li>
                  <li>Post DJ gigs and manage lineups</li>
                  <li>Track registrations and check-ins</li>
                  <li>Manage promoters and payouts</li>
                  <li>Publish event photos</li>
                  <li>View detailed analytics and insights</li>
                </ul>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{organizer_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Go to Organizer Dashboard</a>
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
  'Event Organizer Access Confirmed

Hi {{user_name}},

Congratulations! You''ve been granted Event Organizer access for {{organizer_name}}.

What You Can Do:
- Create and manage events
- Post DJ gigs and manage lineups
- Track registrations and check-ins
- Manage promoters and payouts
- Publish event photos
- View detailed analytics and insights

Go to Organizer Dashboard: {{organizer_dashboard_url}}

Best regards,
The CrowdStack Team',
  '{"user_name": "string", "organizer_name": "string", "organizer_dashboard_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 4. Promoter Welcome Email
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
  'promoter_welcome',
  'role.assigned',
  'auth_onboarding',
  ARRAY['promoter']::user_role[],
  'Welcome to CrowdStack - Promoter Access Confirmed 📢',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Promoter Welcome</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                📢 Promoter Access Confirmed
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{user_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! You''ve been granted <strong style="color: #10B981;">Promoter</strong> access for <strong style="color: #FFFFFF;">{{promoter_name}}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">What You Can Do:</h2>
                <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
                  <li>Generate unique referral links and QR codes</li>
                  <li>Track your referrals and check-ins</li>
                  <li>View your earnings and payout history</li>
                  <li>Manage your promoter profile</li>
                  <li>Access event promotion tools</li>
                </ul>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{promoter_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Go to Promoter Dashboard</a>
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
  'Promoter Access Confirmed

Hi {{user_name}},

Congratulations! You''ve been granted Promoter access for {{promoter_name}}.

What You Can Do:
- Generate unique referral links and QR codes
- Track your referrals and check-ins
- View your earnings and payout history
- Manage your promoter profile
- Access event promotion tools

Go to Promoter Dashboard: {{promoter_dashboard_url}}

Best regards,
The CrowdStack Team',
  '{"user_name": "string", "promoter_name": "string", "promoter_dashboard_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 5. DJ Welcome Email
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
  'dj_welcome',
  'role.assigned',
  'auth_onboarding',
  ARRAY['dj']::user_role[],
  'Welcome to CrowdStack - DJ Profile Created 🎧',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DJ Welcome</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                🎧 DJ Profile Created
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{dj_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Congratulations! Your DJ profile <strong style="color: #FFFFFF;">{{dj_handle}}</strong> has been created on CrowdStack.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">What You Can Do:</h2>
                <ul style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8; margin: 8px 0; padding-left: 20px;">
                  <li>Browse and respond to gig postings</li>
                  <li>Manage your DJ profiles and mixes</li>
                  <li>Track your gig earnings</li>
                  <li>Generate QR codes for your events</li>
                  <li>View your gig history and upcoming shows</li>
                </ul>
              </div>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="{{dj_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Go to DJ Dashboard</a>
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
  'DJ Profile Created

Hi {{dj_name}},

Congratulations! Your DJ profile {{dj_handle}} has been created on CrowdStack.

What You Can Do:
- Browse and respond to gig postings
- Manage your DJ profiles and mixes
- Track your gig earnings
- Generate QR codes for your events
- View your gig history and upcoming shows

Go to DJ Dashboard: {{dj_dashboard_url}}

Best regards,
The CrowdStack Team',
  '{"dj_name": "string", "dj_handle": "string", "dj_dashboard_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 6. Registration Confirmation Email
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
  'registration_confirmation',
  'event.registered',
  'event_lifecycle',
  ARRAY[]::user_role[],
  'You''re Registered: {{event_name}} 🎟️',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                🎟️ You''re Registered!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{attendee_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You''re all set! We''ve confirmed your registration for <strong style="color: #FFFFFF;">{{event_name}}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">Event Details</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Date:</strong> {{event_date}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Time:</strong> {{event_time}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if venue_address}}
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Address:</strong> {{venue_address}}</p>
                {{/if}}
              </div>
              
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
  'You''re Registered!

Hi {{attendee_name}},

You''re all set! We''ve confirmed your registration for {{event_name}}.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue_name}}
{{#if venue_address}}Address: {{venue_address}}{{/if}}

We''ll send you a reminder 6 hours before the event. See you there!

View event: {{event_url}}

Best regards,
The CrowdStack Team',
  '{"attendee_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "event_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

-- 7. Event Reminder Email (6 hours before)
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
  'event_reminder_6h',
  'event.reminder',
  'event_lifecycle',
  ARRAY[]::user_role[],
  'Reminder: {{event_name}} starts in 6 hours! ⏰',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0D10; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0B0D10;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #111318; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
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
                ⏰ Event Starts Soon!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi {{attendee_name}},</p>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong style="color: #10B981;">{{event_name}}</strong> starts in <strong style="color: #10B981;">6 hours</strong>! Don''t forget to join us.
              </p>
              
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 24px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #FFFFFF; font-size: 20px; font-weight: 600; margin: 0 0 12px 0;">Event Details</h2>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Date:</strong> {{event_date}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Time:</strong> {{event_time}}</p>
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Venue:</strong> {{venue_name}}</p>
                {{#if venue_address}}
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0;"><strong>Address:</strong> {{venue_address}}</p>
                {{/if}}
              </div>
              
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                See you there! 🎉
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
  'Event Starts Soon!

Hi {{attendee_name}},

{{event_name}} starts in 6 hours! Don''t forget to join us.

Event Details:
Date: {{event_date}}
Time: {{event_time}}
Venue: {{venue_name}}
{{#if venue_address}}Address: {{venue_address}}{{/if}}

See you there!

View event: {{event_url}}

Best regards,
The CrowdStack Team',
  '{"attendee_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "event_url": "string"}'::jsonb,
  true
) ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  subject = EXCLUDED.subject,
  updated_at = NOW();

