-- Table Booking Timeslots and Cancellation System
-- Adds arrival time requirements, table duration slots, and guest/venue cancellation tracking
-- ============================================

-- ============================================
-- 1. ADD TIMESLOT FIELDS TO VENUE_TABLES
-- ============================================
-- Some tables are "all night", others have limited duration (e.g., restaurant tables for 2 hours)

ALTER TABLE public.venue_tables
ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS default_arrival_buffer_minutes INTEGER DEFAULT 30;

COMMENT ON COLUMN public.venue_tables.slot_duration_minutes IS 'Duration of table slot in minutes. NULL = all night/no time limit.';
COMMENT ON COLUMN public.venue_tables.default_arrival_buffer_minutes IS 'Default minutes after event start that guest should arrive by.';

-- ============================================
-- 2. ADD TIMESLOT FIELDS TO TABLE_BOOKINGS
-- ============================================

ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS slot_start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS slot_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arrival_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_type TEXT;

-- Add constraint for cancellation types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'table_bookings_cancellation_type_check'
  ) THEN
    ALTER TABLE public.table_bookings
    ADD CONSTRAINT table_bookings_cancellation_type_check
    CHECK (cancellation_type IN ('guest', 'venue', 'no_show', 'system'));
  END IF;
END $$;

-- Index for reminder queries (find bookings needing reminders)
CREATE INDEX IF NOT EXISTS idx_table_bookings_reminder
  ON public.table_bookings(arrival_deadline, reminder_sent_at, status)
  WHERE status = 'confirmed' AND reminder_sent_at IS NULL;

-- Index for slot queries
CREATE INDEX IF NOT EXISTS idx_table_bookings_slot_times
  ON public.table_bookings(slot_start_time, slot_end_time)
  WHERE status IN ('pending', 'confirmed');

COMMENT ON COLUMN public.table_bookings.slot_start_time IS 'When the table slot begins (for timed slots).';
COMMENT ON COLUMN public.table_bookings.slot_end_time IS 'When the table slot ends (for timed slots). NULL = all night.';
COMMENT ON COLUMN public.table_bookings.arrival_deadline IS 'Guest must arrive by this time or booking may be cancelled.';
COMMENT ON COLUMN public.table_bookings.reminder_sent_at IS 'When the arrival reminder was sent.';
COMMENT ON COLUMN public.table_bookings.cancelled_by IS 'User who cancelled the booking (guest, venue staff, or system).';
COMMENT ON COLUMN public.table_bookings.cancellation_type IS 'Type of cancellation: guest, venue, no_show, or system.';

-- ============================================
-- 3. ADD REASSIGNED BOOKING TRACKING
-- ============================================
-- Track when a table is reassigned after no-show

ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS reassigned_from_booking_id UUID REFERENCES public.table_bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reassigned_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.table_bookings.reassigned_from_booking_id IS 'If this booking took over from a no-show, links to original booking.';

-- ============================================
-- 4. EMAIL TEMPLATES FOR REMINDERS AND CANCELLATIONS
-- ============================================

-- Arrival Reminder Email (15 mins before arrival deadline)
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
  'table_booking_arrival_reminder',
  'table_booking.arrival_reminder',
  'guest',
  ARRAY['guest'],
  'Reminder: Your table is waiting - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Arrival Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Table Reminder</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your table at <strong>{{event_name}}</strong> is waiting for you!
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold; color: #92400e;">
        Please arrive by {{arrival_deadline}} to keep your reservation.
      </p>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Your Reservation</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Table</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{table_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Venue</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{venue_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Party Size</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{party_size}} guests</td>
        </tr>
        {{#if slot_end_time}}
        <tr>
          <td style="padding: 8px 0; color: #666;">Slot Ends</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{slot_end_time}}</td>
        </tr>
        {{/if}}
      </table>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Tables not claimed by the arrival deadline may be released to other guests.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{booking_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Booking
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      See you soon!<br>
      The {{venue_name}} Team
    </p>
  </div>
</body>
</html>',
  'Table Reminder

Hi {{guest_name}},

Your table at {{event_name}} is waiting for you!

Please arrive by {{arrival_deadline}} to keep your reservation.

Your Reservation:
- Table: {{table_name}}
- Venue: {{venue_name}}
- Party Size: {{party_size}} guests
{{#if slot_end_time}}- Slot Ends: {{slot_end_time}}{{/if}}

Tables not claimed by the arrival deadline may be released to other guests.

View your booking: {{booking_url}}

See you soon!
The {{venue_name}} Team',
  '{"guest_name": "string", "event_name": "string", "arrival_deadline": "string", "table_name": "string", "venue_name": "string", "party_size": "string", "slot_end_time": "string", "booking_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- Guest Cancellation Confirmation Email
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
  'table_booking_guest_cancelled',
  'table_booking.guest_cancelled',
  'guest',
  ARRAY['guest'],
  'Your table booking has been cancelled - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Your table booking for <strong>{{event_name}}</strong> has been cancelled as requested.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Cancelled Booking</h3>
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
      </table>
    </div>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b;">
        <strong>Note:</strong> Deposits are non-refundable for guest cancellations.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      We hope to see you at a future event!
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      The {{venue_name}} Team
    </p>
  </div>
</body>
</html>',
  'Booking Cancelled

Hi {{guest_name}},

Your table booking for {{event_name}} has been cancelled as requested.

Cancelled Booking:
- Event: {{event_name}}
- Date: {{event_date}}
- Table: {{table_name}}

Note: Deposits are non-refundable for guest cancellations.

We hope to see you at a future event!

The {{venue_name}} Team',
  '{"guest_name": "string", "event_name": "string", "event_date": "string", "table_name": "string", "venue_name": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- No-Show Cancellation Email
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
  'table_booking_no_show',
  'table_booking.no_show',
  'guest',
  ARRAY['guest'],
  'Your table has been released - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Released</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Table Released</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Unfortunately, your table at <strong>{{event_name}}</strong> has been released because no guests checked in by the arrival deadline.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Booking Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Event</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{event_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Table</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{table_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Arrival Deadline</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{arrival_deadline}}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b;">
        <strong>Note:</strong> Deposits are non-refundable for no-shows.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      If you believe this was an error, please contact the venue directly.
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      The {{venue_name}} Team
    </p>
  </div>
</body>
</html>',
  'Table Released

Hi {{guest_name}},

Unfortunately, your table at {{event_name}} has been released because no guests checked in by the arrival deadline.

Booking Details:
- Event: {{event_name}}
- Table: {{table_name}}
- Arrival Deadline: {{arrival_deadline}}

Note: Deposits are non-refundable for no-shows.

If you believe this was an error, please contact the venue directly.

The {{venue_name}} Team',
  '{"guest_name": "string", "event_name": "string", "table_name": "string", "arrival_deadline": "string", "venue_name": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- ============================================
-- 5. RLS POLICY FOR GUEST CANCELLATION
-- ============================================
-- Allow guests to update their own bookings (for cancellation)

DROP POLICY IF EXISTS "Guests can cancel own bookings" ON public.table_bookings;

CREATE POLICY "Guests can cancel own bookings"
  ON public.table_bookings FOR UPDATE
  USING (
    attendee_id IN (SELECT id FROM public.attendees WHERE user_id = auth.uid())
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    attendee_id IN (SELECT id FROM public.attendees WHERE user_id = auth.uid())
    AND status = 'cancelled'
    AND cancellation_type = 'guest'
  );
