-- Update Table Booking Confirmed Email with QR code, logo, and invite instructions
-- ============================================

UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <!-- Logo Header -->
  <div style="text-align: center; padding: 20px 0;">
    <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 40px; width: auto;">
  </div>

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Success Header -->
    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
      <h1 style="color: white; margin: 0; font-size: 28px;">You''re In!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your table has been confirmed</p>
    </div>

    <div style="padding: 30px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

      <p style="font-size: 16px; margin-bottom: 20px;">
        Your table booking for <strong>{{event_name}}</strong> is confirmed!
      </p>

      <!-- QR Pass Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{pass_url}}" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: 600;">
          📱 View Your Entry Pass
        </a>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
          Show this QR code at the door
        </p>
      </div>

      <!-- Confirmation Box -->
      <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #155724;">
          <strong>Confirmation #:</strong> {{confirmation_number}}
        </p>
      </div>

      <!-- Booking Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📋 Your Reservation</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Event</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Date</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_date}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Time</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_time}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Venue</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{venue_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Table</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{table_name}} ({{zone_name}})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Party Size</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{party_size}} guests</td>
          </tr>
        </table>
      </div>

      <!-- Invite Friends Section -->
      {{#if party_size_more_than_one}}
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: white;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">👥 Bringing Friends?</h3>
        <p style="margin: 0 0 15px 0; font-size: 14px; opacity: 0.9;">
          You can invite up to {{party_size}} guests to your table. Share your booking link so they can get their own entry passes!
        </p>
        <a href="{{booking_url}}" style="display: inline-block; background: white; color: #764ba2; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
          Invite Your Party →
        </a>
      </div>
      {{/if}}

      <!-- Arrival Instructions -->
      <div style="border-left: 4px solid #667eea; padding-left: 15px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #333;">
          <strong>When you arrive:</strong><br>
          Show your QR code at the door. The host will direct you to your table.
        </p>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        See you there! 🎊<br>
        <strong>The CrowdStack Team</strong>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #764ba2;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'YOU''RE IN! 🎉

Hi {{guest_name}},

Your table booking for {{event_name}} is confirmed!

VIEW YOUR ENTRY PASS: {{pass_url}}
Show this QR code at the door.

Confirmation #: {{confirmation_number}}

YOUR RESERVATION:
- Event: {{event_name}}
- Date: {{event_date}}
- Time: {{event_time}}
- Venue: {{venue_name}}
- Table: {{table_name}} ({{zone_name}})
- Party Size: {{party_size}} guests

BRINGING FRIENDS?
You can invite up to {{party_size}} guests to your table.
Share your booking link so they can get their own entry passes:
{{booking_url}}

WHEN YOU ARRIVE:
Show your QR code at the door. The host will direct you to your table.

See you there! 🎊
The CrowdStack Team',
  variables = '{"guest_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "table_name": "string", "zone_name": "string", "party_size": "string", "minimum_spend": "string", "currency_symbol": "string", "confirmation_number": "string", "pass_url": "string", "booking_url": "string", "party_size_more_than_one": "boolean"}'::jsonb
WHERE slug = 'table_booking_confirmed';

-- Also update the table_party_joined email to include logo and better styling
UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You''re on the List!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <!-- Logo Header -->
  <div style="text-align: center; padding: 20px 0;">
    <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 40px; width: auto;">
  </div>

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Success Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
      <h1 style="color: white; margin: 0; font-size: 28px;">You''re on the List!</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You''ve joined the table party</p>
    </div>

    <div style="padding: 30px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

      <p style="font-size: 16px; margin-bottom: 20px;">
        You''ve been added to the guest list at <strong>{{table_name}}</strong> for <strong>{{event_name}}</strong>!
      </p>

      <!-- QR Pass Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{qr_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 18px; font-weight: 600;">
          📱 View Your Entry Pass
        </a>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
          Show this QR code at the door
        </p>
      </div>

      <!-- Event Details -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Event</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Date</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_date}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Venue</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{venue_name}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Table</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{table_name}}</td>
          </tr>
        </table>
      </div>

      <!-- Arrival Instructions -->
      <div style="border-left: 4px solid #667eea; padding-left: 15px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #333;">
          <strong>When you arrive:</strong><br>
          Show your QR code at the door. The host will direct you to your table.
        </p>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        See you there! 🎊<br>
        <strong>The CrowdStack Team</strong>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #764ba2;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'YOU''RE ON THE LIST! 🎉

Hi {{guest_name}},

You''ve been added to the guest list at {{table_name}} for {{event_name}}!

VIEW YOUR ENTRY PASS: {{qr_url}}
Show this QR code at the door.

EVENT DETAILS:
- Event: {{event_name}}
- Date: {{event_date}}
- Venue: {{venue_name}}
- Table: {{table_name}}

WHEN YOU ARRIVE:
Show your QR code at the door. The host will direct you to your table.

See you there! 🎊
The CrowdStack Team'
WHERE slug = 'table_party_joined';
