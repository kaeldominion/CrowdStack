-- Seed Email Templates for Promoter Payout System
-- Creates initial email templates for all promoter-related communications
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

-- ============================================
-- PROMOTER EMAILS
-- ============================================

-- Promoter Welcome Email (one-time onboarding)
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
  'promoter_welcome',
  'promoter.created',
  'auth_onboarding',
  ARRAY['promoter'],
  'Welcome to CrowdStack!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CrowdStack</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to CrowdStack!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Welcome to CrowdStack! We''re excited to have you join our platform as a promoter.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      As a promoter on CrowdStack, you can:
    </p>
    
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
      <li>Promote events and earn commissions</li>
      <li>Track your performance in real-time</li>
      <li>Get paid quickly and transparently</li>
      <li>Build your network in the nightlife industry</li>
    </ul>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your account email: <strong>{{promoter_email}}</strong>
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions, feel free to reach out to our support team.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 10px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Welcome to CrowdStack!

Hi {{promoter_name}},

Welcome to CrowdStack! We''re excited to have you join our platform as a promoter.

As a promoter on CrowdStack, you can:
- Promote events and earn commissions
- Track your performance in real-time
- Get paid quickly and transparently
- Build your network in the nightlife industry

Your account email: {{promoter_email}}

Go to Dashboard: https://crowdstack.app/app/promoter

If you have any questions, feel free to reach out to our support team.

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "promoter_email": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Promoter Event Assignment Email
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
  'promoter_event_assigned',
  'promoter.event_assigned',
  'event_lifecycle',
  ARRAY['promoter'],
  'You''ve been assigned to promote: {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Event Assignment</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">New Event Assignment</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      You''ve been assigned to promote <strong>{{event_name}}</strong>!
    </p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;"><strong>Event Date:</strong> {{event_date}}</p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;"><strong>Payout Terms:</strong> {{payout_terms}}</p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Start promoting now to maximize your earnings!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/events" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Event Details</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'New Event Assignment

Hi {{promoter_name}},

You''ve been assigned to promote {{event_name}}!

Event Date: {{event_date}}
Payout Terms: {{payout_terms}}

Start promoting now to maximize your earnings!

View Event Details: https://crowdstack.app/app/promoter/events

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "event_date": "string", "payout_terms": "string", "currency": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Promoter Terms Updated Email
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
  'promoter_terms_updated',
  'promoter.terms_updated',
  'event_lifecycle',
  ARRAY['promoter'],
  'Payout terms updated for: {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Terms Updated</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Payout Terms Updated</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      The payout terms for <strong>{{event_name}}</strong> have been updated.
    </p>
    
    <div style="background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;"><strong>Changes:</strong></p>
      <pre style="margin: 10px 0 0 0; font-size: 13px; color: #856404; white-space: pre-wrap;">{{changes}}</pre>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Please review the updated terms and contact us if you have any questions.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/events" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Updated Terms</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Payout Terms Updated

Hi {{promoter_name}},

The payout terms for {{event_name}} have been updated.

Changes:
{{changes}}

Please review the updated terms and contact us if you have any questions.

View Updated Terms: https://crowdstack.app/app/promoter/events

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "changes": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PAYOUT EMAILS
-- ============================================

-- Payout Ready Email
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
  'payout_ready',
  'payout.ready',
  'payout',
  ARRAY['promoter'],
  'Your payout is ready: {{payout_amount}} {{currency}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payout Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💰 Payout Ready!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your payout for <strong>{{event_name}}</strong> is ready.
    </p>
    
    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="margin: 0; font-size: 14px; color: white; opacity: 0.9;">Total Payout</p>
      <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: white;">{{payout_amount}} {{currency}}</p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your payout statement is available for download.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{statement_url}}" style="display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Download Statement</a>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      The organizer will process your payment shortly. You''ll receive another email once payment is confirmed.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/earnings" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Earnings</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Payout Ready

Hi {{promoter_name}},

Great news! Your payout for {{event_name}} is ready.

Total Payout: {{payout_amount}} {{currency}}

Your payout statement is available for download: {{statement_url}}

The organizer will process your payment shortly. You''ll receive another email once payment is confirmed.

View Earnings: https://crowdstack.app/app/promoter/earnings

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "payout_amount": "number", "currency": "string", "statement_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Payment Received Email
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
  'payment_received',
  'payment.received',
  'payout',
  ARRAY['promoter'],
  'Payment confirmed: {{payout_amount}} {{currency}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Payment Confirmed</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your payment for <strong>{{event_name}}</strong> has been confirmed!
    </p>
    
    <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="margin: 0; font-size: 14px; color: white; opacity: 0.9;">Amount Received</p>
      <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: white;">{{payout_amount}} {{currency}}</p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Payment proof is available for your records.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{proof_url}}" style="display: inline-block; background: #11998e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Proof</a>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/earnings" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View All Earnings</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Thank you for promoting with CrowdStack!<br><br>
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Payment Confirmed

Hi {{promoter_name}},

Your payment for {{event_name}} has been confirmed!

Amount Received: {{payout_amount}} {{currency}}

Payment proof is available: {{proof_url}}

View All Earnings: https://crowdstack.app/app/promoter/earnings

Thank you for promoting with CrowdStack!

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "payout_amount": "number", "currency": "string", "proof_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- BONUS NOTIFICATIONS
-- ============================================

-- Bonus Progress 80% Notification
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
  'bonus_progress_80',
  'bonus.progress_80',
  'bonus',
  ARRAY['promoter'],
  '🎯 You''re 80% to your bonus target!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bonus Progress</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎯 You''re Almost There!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great work on <strong>{{event_name}}</strong>! You''re making excellent progress toward your bonus.
    </p>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-size: 14px; color: #666;">Check-ins</span>
          <span style="font-size: 14px; color: #666; font-weight: 600;">{{checkins_count}} / {{bonus_threshold}}</span>
        </div>
        <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); height: 100%; width: 80%;"></div>
        </div>
      </div>
      <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
        <strong>Remaining:</strong> {{remaining_guests}} more guests to unlock your bonus!
      </p>
      <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: 600; color: #f5576c;">
        Bonus: {{bonus_amount}} {{currency}}
      </p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Keep promoting to reach your target and earn that bonus!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/events" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Event</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Bonus Progress Update

Hi {{promoter_name}},

Great work on {{event_name}}! You''re making excellent progress toward your bonus.

Check-ins: {{checkins_count}} / {{bonus_threshold}}
Remaining: {{remaining_guests}} more guests to unlock your bonus!
Bonus: {{bonus_amount}} {{currency}}

Keep promoting to reach your target and earn that bonus!

View Event: https://crowdstack.app/app/promoter/events

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "checkins_count": "number", "bonus_threshold": "number", "remaining_guests": "number", "bonus_amount": "number", "currency": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

-- Bonus Achieved Notification
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
  'bonus_achieved',
  'bonus.achieved',
  'bonus',
  ARRAY['promoter'],
  '🎉 Bonus Unlocked! You''ve reached your target!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bonus Achieved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bonus Unlocked!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{promoter_name}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Congratulations! You''ve reached your bonus target for <strong>{{event_name}}</strong>!
    </p>
    
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
      <p style="margin: 0; font-size: 14px; color: white; opacity: 0.9;">Check-ins Achieved</p>
      <p style="margin: 10px 0 0 0; font-size: 36px; font-weight: bold; color: white;">{{checkins_count}}</p>
      <p style="margin: 15px 0 0 0; font-size: 14px; color: white; opacity: 0.9;">Target: {{bonus_threshold}}</p>
    </div>
    
    <div style="background: #fff3cd; padding: 20px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #856404;">Bonus Earned</p>
      <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #856404;">{{bonus_amount}} {{currency}}</p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Amazing work! This bonus will be included in your final payout when the event closes.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://crowdstack.app/app/promoter/events" style="display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Event</a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Keep up the great work!<br><br>
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Bonus Achieved!

Hi {{promoter_name}},

Congratulations! You''ve reached your bonus target for {{event_name}}!

Check-ins Achieved: {{checkins_count}}
Target: {{bonus_threshold}}

Bonus Earned: {{bonus_amount}} {{currency}}

Amazing work! This bonus will be included in your final payout when the event closes.

View Event: https://crowdstack.app/app/promoter/events

Keep up the great work!

Best regards,
The CrowdStack Team',
  '{"promoter_name": "string", "event_name": "string", "checkins_count": "number", "bonus_threshold": "number", "bonus_amount": "number", "currency": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.email_templates IS 'Email templates seeded for promoter payout system. Templates can be edited via /admin/communications';

