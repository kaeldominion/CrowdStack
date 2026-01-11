-- Table Booking Email Templates
-- Templates for table booking request and confirmation emails
-- ============================================

-- Table Booking Request Email (sent when booking is submitted)
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
  'table_booking_request',
  'table_booking.created',
  'guest',
  ARRAY['attendee'],
  'Table Booking Request - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Booking Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Table Booking Request</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your table booking request has been received for <strong>{{event_name}}</strong>.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Booking Details</h3>
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
          <td style="padding: 8px 0; color: #666;">Table</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{table_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Zone</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{zone_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Party Size</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{party_size}} guests</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Minimum Spend</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{currency_symbol}}{{minimum_spend}}</td>
        </tr>
      </table>
    </div>

    {{#deposit_required}}
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Deposit Required:</strong> {{currency_symbol}}{{deposit_amount}}<br>
        {{deposit_instructions}}
      </p>
    </div>
    {{/deposit_required}}

    <p style="font-size: 16px; margin-bottom: 20px;">
      We will contact you shortly via WhatsApp to confirm your booking.
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Table Booking Request - {{event_name}}

Hi {{guest_name}},

Your table booking request has been received for {{event_name}}.

Booking Details:
- Event: {{event_name}}
- Date: {{event_date}}
- Table: {{table_name}}
- Zone: {{zone_name}}
- Party Size: {{party_size}} guests
- Minimum Spend: {{currency_symbol}}{{minimum_spend}}

{{#deposit_required}}
Deposit Required: {{currency_symbol}}{{deposit_amount}}
{{deposit_instructions}}
{{/deposit_required}}

We will contact you shortly via WhatsApp to confirm your booking.

Best regards,
The CrowdStack Team',
  '{"guest_name": "string", "event_name": "string", "event_date": "string", "table_name": "string", "zone_name": "string", "party_size": "string", "minimum_spend": "string", "currency_symbol": "string", "deposit_required": "string", "deposit_amount": "string", "deposit_instructions": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- Table Booking Confirmed Email (sent after payment or manual confirmation)
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
  'table_booking_confirmed',
  'table_booking.confirmed',
  'guest',
  ARRAY['attendee'],
  'Booking Confirmed - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your table booking for <strong>{{event_name}}</strong> has been confirmed.
    </p>

    <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #155724;">
        <strong>Confirmation #:</strong> {{confirmation_number}}
      </p>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Your Reservation</h3>
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
        <tr>
          <td style="padding: 8px 0; color: #666;">Minimum Spend</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{currency_symbol}}{{minimum_spend}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Please arrive on time and present this confirmation at the door.
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      See you there!<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'Booking Confirmed - {{event_name}}

Hi {{guest_name}},

Great news! Your table booking for {{event_name}} has been confirmed.

Confirmation #: {{confirmation_number}}

Your Reservation:
- Event: {{event_name}}
- Date: {{event_date}}
- Time: {{event_time}}
- Venue: {{venue_name}}
- Table: {{table_name}} ({{zone_name}})
- Party Size: {{party_size}} guests
- Minimum Spend: {{currency_symbol}}{{minimum_spend}}

Please arrive on time and present this confirmation at the door.

See you there!
The CrowdStack Team',
  '{"guest_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "venue_address": "string", "table_name": "string", "zone_name": "string", "party_size": "string", "minimum_spend": "string", "currency_symbol": "string", "confirmation_number": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;
