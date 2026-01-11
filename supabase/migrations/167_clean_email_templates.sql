-- Clean up email templates with glassnode-style design
-- Minimal, dark theme, clean typography
-- ============================================

-- Update Table Booking Confirmed Email
UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #E2E8F0; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505;">

  <div style="background: #0A0A0A; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
    <!-- Header -->
    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 32px; width: auto; margin-bottom: 16px;">
      <h1 style="color: #E2E8F0; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Booking Confirmed</h1>
      <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">Your table is reserved</p>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-bottom: 20px; color: #E2E8F0;">Hi {{guest_name}},</p>

      <p style="font-size: 15px; margin-bottom: 24px; color: #94A3B8;">
        Your table at <strong style="color: #E2E8F0;">{{event_name}}</strong> has been confirmed.
      </p>

      <!-- Entry Pass Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{pass_url}}" style="display: inline-block; background: #A855F7; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;">
          View Entry Pass
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #475569;">
          Show this QR code at the door
        </p>
      </div>

      <!-- Confirmation Box -->
      <div style="background: #111111; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
        <p style="margin: 0; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em;">
          Confirmation
        </p>
        <p style="margin: 4px 0 0 0; font-size: 18px; color: #E2E8F0; font-family: monospace; font-weight: 600;">
          #{{confirmation_number}}
        </p>
      </div>

      <!-- Booking Details -->
      <div style="background: #111111; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Event</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Date</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_date}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Time</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_time}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Venue</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{venue_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Table</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{table_name}} &middot; {{zone_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569;">Party Size</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0;">{{party_size}} guests</td>
          </tr>
        </table>
      </div>

      <!-- Invite Friends Section -->
      {{#if party_size_more_than_one}}
      <div style="background: #111111; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba(168,85,247,0.2);">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #E2E8F0; font-weight: 600;">Invite Your Party</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #94A3B8;">
          Share this link so your guests can get their own entry passes.
        </p>
        <a href="{{booking_url}}" style="display: inline-block; background: #1A1A1A; color: #A855F7; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 500; border: 1px solid rgba(168,85,247,0.3);">
          Share Invite Link
        </a>
      </div>
      {{/if}}

      <p style="font-size: 13px; color: #475569; margin-top: 32px;">
        See you there,<br>
        <span style="color: #94A3B8;">The CrowdStack Team</span>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px; font-size: 11px; color: #475569;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #A855F7; text-decoration: none;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'BOOKING CONFIRMED

Hi {{guest_name}},

Your table at {{event_name}} has been confirmed.

VIEW YOUR ENTRY PASS: {{pass_url}}
Show this QR code at the door.

Confirmation: #{{confirmation_number}}

YOUR RESERVATION:
- Event: {{event_name}}
- Date: {{event_date}}
- Time: {{event_time}}
- Venue: {{venue_name}}
- Table: {{table_name}} - {{zone_name}}
- Party Size: {{party_size}} guests

INVITE YOUR PARTY:
Share this link so your guests can get their own entry passes:
{{booking_url}}

See you there,
The CrowdStack Team'
WHERE slug = 'table_booking_confirmed';

-- Update Table Party Joined Email
UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You''re on the List</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #E2E8F0; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505;">

  <div style="background: #0A0A0A; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
    <!-- Header -->
    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 32px; width: auto; margin-bottom: 16px;">
      <h1 style="color: #E2E8F0; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">You''re on the List</h1>
      <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">Your spot is confirmed</p>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-bottom: 20px; color: #E2E8F0;">Hi {{guest_name}},</p>

      <p style="font-size: 15px; margin-bottom: 24px; color: #94A3B8;">
        You''ve joined the table at <strong style="color: #E2E8F0;">{{event_name}}</strong>.
      </p>

      <!-- Entry Pass Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{qr_url}}" style="display: inline-block; background: #A855F7; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;">
          View Entry Pass
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #475569;">
          Show this QR code at the door
        </p>
      </div>

      <!-- Event Details -->
      <div style="background: #111111; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Event</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Date</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_date}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Venue</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{venue_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569;">Table</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0;">{{table_name}}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; margin-top: 32px;">
        See you there,<br>
        <span style="color: #94A3B8;">The CrowdStack Team</span>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px; font-size: 11px; color: #475569;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #A855F7; text-decoration: none;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'YOU''RE ON THE LIST

Hi {{guest_name}},

You''ve joined the table at {{event_name}}.

VIEW YOUR ENTRY PASS: {{qr_url}}
Show this QR code at the door.

EVENT DETAILS:
- Event: {{event_name}}
- Date: {{event_date}}
- Venue: {{venue_name}}
- Table: {{table_name}}

See you there,
The CrowdStack Team'
WHERE slug = 'table_party_joined';

-- Update Table Party Invite Email
UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Invite</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #E2E8F0; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505;">

  <div style="background: #0A0A0A; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
    <!-- Header -->
    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 32px; width: auto; margin-bottom: 16px;">
      <h1 style="color: #E2E8F0; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">You''re Invited</h1>
      <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px;">{{host_name}} invited you to their table</p>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-bottom: 20px; color: #E2E8F0;">Hi {{guest_name}},</p>

      <p style="font-size: 15px; margin-bottom: 24px; color: #94A3B8;">
        <strong style="color: #E2E8F0;">{{host_name}}</strong> has invited you to join their table at <strong style="color: #E2E8F0;">{{event_name}}</strong>.
      </p>

      <!-- Join Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{join_url}}" style="display: inline-block; background: #A855F7; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;">
          Accept Invite
        </a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #475569;">
          Confirm your spot and get your entry pass
        </p>
      </div>

      <!-- Event Details -->
      <div style="background: #111111; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.05);">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Event</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Date</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{event_date}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569; border-bottom: 1px solid rgba(255,255,255,0.05);">Venue</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0; border-bottom: 1px solid rgba(255,255,255,0.05);">{{venue_name}}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #475569;">Table</td>
            <td style="padding: 10px 0; text-align: right; color: #E2E8F0;">{{table_name}}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; margin-top: 32px;">
        See you there,<br>
        <span style="color: #94A3B8;">The CrowdStack Team</span>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px; font-size: 11px; color: #475569;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #A855F7; text-decoration: none;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'YOU''RE INVITED

Hi {{guest_name}},

{{host_name}} has invited you to join their table at {{event_name}}.

ACCEPT INVITE: {{join_url}}
Confirm your spot and get your entry pass.

EVENT DETAILS:
- Event: {{event_name}}
- Date: {{event_date}}
- Venue: {{venue_name}}
- Table: {{table_name}}

See you there,
The CrowdStack Team'
WHERE slug = 'table_party_invite';

-- Update Table Booking Cancelled Email
UPDATE public.email_templates
SET
  html_body = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #E2E8F0; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050505;">

  <div style="background: #0A0A0A; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
    <!-- Header -->
    <div style="padding: 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <img src="https://crowdstack.com/logo-tricolor.png" alt="CrowdStack" style="height: 32px; width: auto; margin-bottom: 16px;">
      <h1 style="color: #E2E8F0; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Booking Cancelled</h1>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; margin-bottom: 20px; color: #E2E8F0;">Hi {{guest_name}},</p>

      <p style="font-size: 15px; margin-bottom: 24px; color: #94A3B8;">
        Your table booking for <strong style="color: #E2E8F0;">{{event_name}}</strong> on {{event_date}} has been cancelled.
      </p>

      <div style="background: #111111; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid rgba(239,68,68,0.2);">
        <p style="margin: 0; font-size: 14px; color: #94A3B8;">
          If you believe this was a mistake or have any questions, please contact the venue directly.
        </p>
      </div>

      <p style="font-size: 13px; color: #475569; margin-top: 32px;">
        Best regards,<br>
        <span style="color: #94A3B8;">The CrowdStack Team</span>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 24px; font-size: 11px; color: #475569;">
    <p style="margin: 0;">Powered by <a href="https://crowdstack.com" style="color: #A855F7; text-decoration: none;">CrowdStack</a></p>
  </div>
</body>
</html>',
  text_body = 'BOOKING CANCELLED

Hi {{guest_name}},

Your table booking for {{event_name}} on {{event_date}} has been cancelled.

If you believe this was a mistake or have any questions, please contact the venue directly.

Best regards,
The CrowdStack Team'
WHERE slug = 'table_booking_cancelled';
