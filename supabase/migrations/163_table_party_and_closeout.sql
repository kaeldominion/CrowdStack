-- Table Party Guests and Closeout System
-- Comprehensive table booking management with party guests, CSV closeout, and commission tracking
-- ============================================

-- ============================================
-- 1. TABLE PARTY GUESTS
-- ============================================
-- Tracks individual guests who join a table booking party
-- Each guest gets their own QR code for door check-in

CREATE TABLE IF NOT EXISTS public.table_party_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.table_bookings(id) ON DELETE CASCADE,

  -- Guest identity (links to attendee if registered)
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,

  -- Invite tracking
  invite_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,

  -- QR code for door check-in (JWT token)
  qr_token TEXT,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'joined', 'declined', 'removed')),
  is_host BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each email can only be in a booking once
  UNIQUE(booking_id, guest_email)
);

-- Indexes for party guests
CREATE INDEX IF NOT EXISTS idx_table_party_guests_booking_id ON public.table_party_guests(booking_id);
CREATE INDEX IF NOT EXISTS idx_table_party_guests_attendee_id ON public.table_party_guests(attendee_id);
CREATE INDEX IF NOT EXISTS idx_table_party_guests_invite_token ON public.table_party_guests(invite_token);
CREATE INDEX IF NOT EXISTS idx_table_party_guests_status ON public.table_party_guests(status);
CREATE INDEX IF NOT EXISTS idx_table_party_guests_checked_in ON public.table_party_guests(checked_in) WHERE checked_in = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_table_party_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_party_guests_updated_at ON public.table_party_guests;
CREATE TRIGGER trigger_update_table_party_guests_updated_at
  BEFORE UPDATE ON public.table_party_guests
  FOR EACH ROW
  EXECUTE FUNCTION update_table_party_guests_updated_at();


-- ============================================
-- 2. TABLE CLOSEOUT IMPORTS
-- ============================================
-- Tracks CSV imports from POS systems for actual spend data

CREATE TABLE IF NOT EXISTS public.table_closeout_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Import metadata
  filename TEXT,
  import_type TEXT DEFAULT 'csv' CHECK (import_type IN ('csv', 'manual')),
  row_count INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  unmatched_count INTEGER DEFAULT 0,

  -- Raw data for audit trail
  raw_data JSONB,
  mapping_config JSONB,
  unmatched_rows JSONB,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Audit
  imported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for closeout imports
CREATE INDEX IF NOT EXISTS idx_table_closeout_imports_event_id ON public.table_closeout_imports(event_id);
CREATE INDEX IF NOT EXISTS idx_table_closeout_imports_status ON public.table_closeout_imports(status);


-- ============================================
-- 3. TABLE BOOKING COMMISSIONS
-- ============================================
-- Calculated commissions for each booking (promoter + venue cut)

CREATE TABLE IF NOT EXISTS public.table_booking_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.table_bookings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Spend amounts
  spend_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  spend_source TEXT NOT NULL DEFAULT 'minimum' CHECK (spend_source IN ('actual', 'minimum', 'manual')),

  -- Promoter commission
  promoter_id UUID REFERENCES public.promoters(id) ON DELETE SET NULL,
  promoter_commission_rate DECIMAL(5, 2) DEFAULT 0,
  promoter_commission_amount DECIMAL(12, 2) DEFAULT 0,

  -- Venue cut
  venue_commission_rate DECIMAL(5, 2) DEFAULT 0,
  venue_commission_amount DECIMAL(12, 2) DEFAULT 0,

  -- Lock status (prevents edits after closeout)
  locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Audit
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One commission record per booking
  UNIQUE(booking_id)
);

-- Indexes for commissions
CREATE INDEX IF NOT EXISTS idx_table_booking_commissions_booking_id ON public.table_booking_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_table_booking_commissions_event_id ON public.table_booking_commissions(event_id);
CREATE INDEX IF NOT EXISTS idx_table_booking_commissions_promoter_id ON public.table_booking_commissions(promoter_id);
CREATE INDEX IF NOT EXISTS idx_table_booking_commissions_locked ON public.table_booking_commissions(locked);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_table_booking_commissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_booking_commissions_updated_at ON public.table_booking_commissions;
CREATE TRIGGER trigger_update_table_booking_commissions_updated_at
  BEFORE UPDATE ON public.table_booking_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_table_booking_commissions_updated_at();


-- ============================================
-- 4. ALTER TABLE BOOKINGS
-- ============================================
-- Add closeout and party link fields

ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS closeout_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closeout_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closeout_locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS party_invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS party_link_expires_at TIMESTAMP WITH TIME ZONE;

-- Index for party invite codes
CREATE INDEX IF NOT EXISTS idx_table_bookings_party_invite_code ON public.table_bookings(party_invite_code) WHERE party_invite_code IS NOT NULL;


-- ============================================
-- 5. ALTER EVENTS TABLE
-- ============================================
-- Add event-level closeout tracking

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS tables_closeout_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tables_closeout_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.table_party_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_closeout_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_booking_commissions ENABLE ROW LEVEL SECURITY;

-- Party Guests: Allow venue users to manage
CREATE POLICY "Venue users can manage party guests"
ON public.table_party_guests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.table_bookings tb
    JOIN public.events e ON e.id = tb.event_id
    JOIN public.venue_users vu ON vu.venue_id = e.venue_id
    WHERE tb.id = table_party_guests.booking_id
    AND vu.user_id = auth.uid()
  )
);

-- Party Guests: Allow guests to view their own records
CREATE POLICY "Guests can view own party guest record"
ON public.table_party_guests
FOR SELECT
USING (
  attendee_id IN (
    SELECT id FROM public.attendees WHERE user_id = auth.uid()
  )
);

-- Closeout Imports: Venue users only
CREATE POLICY "Venue users can manage closeout imports"
ON public.table_closeout_imports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.venue_users vu ON vu.venue_id = e.venue_id
    WHERE e.id = table_closeout_imports.event_id
    AND vu.user_id = auth.uid()
  )
);

-- Commissions: Venue users can manage, promoters can view their own
CREATE POLICY "Venue users can manage commissions"
ON public.table_booking_commissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.venue_users vu ON vu.venue_id = e.venue_id
    WHERE e.id = table_booking_commissions.event_id
    AND vu.user_id = auth.uid()
  )
);

CREATE POLICY "Promoters can view own commissions"
ON public.table_booking_commissions
FOR SELECT
USING (
  promoter_id IN (
    SELECT id FROM public.promoters WHERE created_by = auth.uid()
  )
);


-- ============================================
-- 7. EMAIL TEMPLATES FOR PARTY SYSTEM
-- ============================================

-- Table Party Invite Email
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
  'table_party_invite',
  'table_party.guest_invited',
  'guest',
  ARRAY['attendee'],
  'You''re Invited to {{host_name}}''s Table - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Table Party Invite</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You''re Invited!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>{{host_name}}</strong> has invited you to join their table at <strong>{{event_name}}</strong>.
    </p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Event Details</h3>
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
        <tr>
          <td style="padding: 8px 0; color: #666;">Party Size</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">{{party_size}} guests</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{join_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Join the Party
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Click the button above to confirm your spot and get your personal QR code for entry.
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      See you there!<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'You''re Invited to {{host_name}}''s Table - {{event_name}}

Hi {{guest_name}},

{{host_name}} has invited you to join their table at {{event_name}}.

Event Details:
- Event: {{event_name}}
- Date: {{event_date}}
- Venue: {{venue_name}}
- Table: {{table_name}}
- Party Size: {{party_size}} guests

Join the party here: {{join_url}}

Click the link above to confirm your spot and get your personal QR code for entry.

See you there!
The CrowdStack Team',
  '{"guest_name": "string", "host_name": "string", "event_name": "string", "event_date": "string", "venue_name": "string", "table_name": "string", "party_size": "string", "join_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- Table Party Joined Confirmation
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
  'table_party_joined',
  'table_party.guest_joined',
  'guest',
  ARRAY['attendee'],
  'You''re In! Your Pass for {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Table Pass</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You''re In!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{guest_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      You''ve joined <strong>{{host_name}}</strong>''s table at <strong>{{event_name}}</strong>!
    </p>

    <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #155724;">
        <strong>Table:</strong> {{table_name}}
      </p>
    </div>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #333;">Event Details</h3>
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
      </table>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{pass_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Your Pass
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Show your QR code at the door for entry. Make sure to arrive on time!
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      See you there!<br>
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  'You''re In! Your Pass for {{event_name}}

Hi {{guest_name}},

You''ve joined {{host_name}}''s table at {{event_name}}!

Table: {{table_name}}

Event Details:
- Event: {{event_name}}
- Date: {{event_date}}
- Time: {{event_time}}
- Venue: {{venue_name}}

View your pass here: {{pass_url}}

Show your QR code at the door for entry. Make sure to arrive on time!

See you there!
The CrowdStack Team',
  '{"guest_name": "string", "host_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "venue_name": "string", "table_name": "string", "pass_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;

-- Host notification when guest joins
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
  'table_party_guest_joined_host',
  'table_party.guest_joined',
  'guest',
  ARRAY['attendee'],
  '{{guest_name}} Joined Your Table - {{event_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guest Joined Your Table</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Guest Joined!</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi {{host_name}},</p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! <strong>{{guest_name}}</strong> has joined your table at <strong>{{event_name}}</strong>.
    </p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Party Status:</strong> {{current_count}} of {{party_size}} guests confirmed
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{booking_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        View Your Booking
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      The CrowdStack Team
    </p>
  </div>
</body>
</html>',
  '{{guest_name}} Joined Your Table - {{event_name}}

Hi {{host_name}},

Great news! {{guest_name}} has joined your table at {{event_name}}.

Party Status: {{current_count}} of {{party_size}} guests confirmed

View your booking: {{booking_url}}

The CrowdStack Team',
  '{"host_name": "string", "guest_name": "string", "event_name": "string", "current_count": "string", "party_size": "string", "booking_url": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  enabled = true;
