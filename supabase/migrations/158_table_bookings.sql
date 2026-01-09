-- Table Booking System
-- Enables guest table booking requests, staff management, and closeout integration

-- ============================================================================
-- 1. ADD COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add table_booking_mode to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS table_booking_mode TEXT DEFAULT 'disabled';

-- Add constraint for valid booking modes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_table_booking_mode_check'
  ) THEN
    ALTER TABLE public.events
    ADD CONSTRAINT events_table_booking_mode_check
    CHECK (table_booking_mode IN ('disabled', 'promoter_only', 'direct'));
  END IF;
END $$;

-- Add table_commission_rate to venues (default 10%)
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS table_commission_rate DECIMAL(5, 2) DEFAULT 10.00;

-- ============================================================================
-- 2. TABLE BOOKINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.table_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.venue_tables(id) ON DELETE CASCADE,

  -- Guest info (links to attendee if registered)
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_whatsapp TEXT NOT NULL,  -- Required for direct contact
  party_size INTEGER NOT NULL DEFAULT 1,
  special_requests TEXT,

  -- Promoter attribution (from referral tracking)
  promoter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT,

  -- Booking status
  status TEXT NOT NULL DEFAULT 'pending',

  -- Financial tracking
  deposit_required DECIMAL(10, 2),
  deposit_received BOOLEAN DEFAULT FALSE,
  deposit_received_at TIMESTAMP WITH TIME ZONE,
  minimum_spend DECIMAL(10, 2),
  actual_spend DECIMAL(10, 2),

  -- Staff notes and tracking
  staff_notes TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint for valid booking statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'table_bookings_status_check'
  ) THEN
    ALTER TABLE public.table_bookings
    ADD CONSTRAINT table_bookings_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed'));
  END IF;
END $$;

-- Indexes for table_bookings
CREATE INDEX IF NOT EXISTS idx_table_bookings_event_id ON public.table_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_table_id ON public.table_bookings(table_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_attendee_id ON public.table_bookings(attendee_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_promoter_id ON public.table_bookings(promoter_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_status ON public.table_bookings(status);
CREATE INDEX IF NOT EXISTS idx_table_bookings_guest_email ON public.table_bookings(guest_email);

-- RLS for table_bookings
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all bookings
CREATE POLICY "Superadmins can manage all bookings"
  ON public.table_bookings FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue staff can manage bookings for their events
CREATE POLICY "Venue staff can manage bookings"
  ON public.table_bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = table_bookings.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = table_bookings.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Promoters can view bookings they referred
CREATE POLICY "Promoters can view own referrals"
  ON public.table_bookings FOR SELECT
  USING (promoter_id = auth.uid());

-- Guests can view their own bookings (via attendee link)
CREATE POLICY "Guests can view own bookings"
  ON public.table_bookings FOR SELECT
  USING (
    attendee_id IN (SELECT id FROM public.attendees WHERE user_id = auth.uid())
  );

-- Anyone can create a booking request (public)
CREATE POLICY "Anyone can create booking request"
  ON public.table_bookings FOR INSERT
  WITH CHECK (status = 'pending');

-- Trigger for updated_at
CREATE TRIGGER set_table_bookings_updated_at
  BEFORE UPDATE ON public.table_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. TABLE BOOKING LINKS (Direct shareable links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.table_booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.venue_tables(id) ON DELETE CASCADE,  -- NULL = any table
  code TEXT NOT NULL UNIQUE,  -- Short unique code for URL
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE  -- Optional expiry
);

-- Indexes for table_booking_links
CREATE INDEX IF NOT EXISTS idx_table_booking_links_code ON public.table_booking_links(code);
CREATE INDEX IF NOT EXISTS idx_table_booking_links_event_id ON public.table_booking_links(event_id);
CREATE INDEX IF NOT EXISTS idx_table_booking_links_is_active ON public.table_booking_links(is_active);

-- RLS for table_booking_links
ALTER TABLE public.table_booking_links ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all booking links
CREATE POLICY "Superadmins can manage all booking links"
  ON public.table_booking_links FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

-- Venue staff can manage booking links for their events
CREATE POLICY "Venue staff can manage booking links"
  ON public.table_booking_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = table_booking_links.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = table_booking_links.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Public can read active booking links (to resolve them)
CREATE POLICY "Anyone can read active booking links"
  ON public.table_booking_links FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- ============================================================================
-- 4. EMAIL TEMPLATES FOR TABLE BOOKINGS
-- ============================================================================

-- Insert email templates (using existing email_templates table)
-- Note: Using 'guest' category since that's a valid enum value
INSERT INTO public.email_templates (slug, trigger, category, target_roles, subject, html_body, text_body, variables)
VALUES
  (
    'table_booking_request',
    'table_booking.created',
    'guest',
    ARRAY['guest'],
    'Your table booking request for {{event_name}}',
    '<h2>Table Booking Request Received</h2>
<p>Hi {{guest_name}},</p>
<p>We''ve received your table booking request for <strong>{{event_name}}</strong>.</p>

<h3>Booking Details</h3>
<ul>
  <li><strong>Event:</strong> {{event_name}}</li>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Table:</strong> {{table_name}} ({{zone_name}})</li>
  <li><strong>Party Size:</strong> {{party_size}}</li>
  <li><strong>Minimum Spend:</strong> {{currency_symbol}}{{minimum_spend}}</li>
</ul>

{{#if deposit_required}}
<h3>Deposit Required</h3>
<p>A deposit of <strong>{{currency_symbol}}{{deposit_amount}}</strong> is required to confirm your booking.</p>
<p>{{deposit_instructions}}</p>
{{/if}}

<p>Our team will review your request and contact you shortly to confirm.</p>

<p>Questions? Reply to this email or contact the venue directly.</p>',
    'Table Booking Request Received

Hi {{guest_name}},

We''ve received your table booking request for {{event_name}}.

BOOKING DETAILS
- Event: {{event_name}}
- Date: {{event_date}}
- Table: {{table_name}} ({{zone_name}})
- Party Size: {{party_size}}
- Minimum Spend: {{currency_symbol}}{{minimum_spend}}

{{#if deposit_required}}
DEPOSIT REQUIRED
A deposit of {{currency_symbol}}{{deposit_amount}} is required to confirm your booking.
{{deposit_instructions}}
{{/if}}

Our team will review your request and contact you shortly to confirm.

Questions? Reply to this email or contact the venue directly.',
    '{"guest_name": "string", "event_name": "string", "event_date": "string", "table_name": "string", "zone_name": "string", "party_size": "string", "minimum_spend": "string", "currency_symbol": "string", "deposit_required": "boolean", "deposit_amount": "string", "deposit_instructions": "string"}'::jsonb
  ),
  (
    'table_booking_confirmed',
    'table_booking.confirmed',
    'guest',
    ARRAY['guest'],
    'Your table is confirmed for {{event_name}}!',
    '<h2>Table Booking Confirmed!</h2>
<p>Hi {{guest_name}},</p>
<p>Great news! Your table booking for <strong>{{event_name}}</strong> has been confirmed.</p>

<h3>Confirmation Details</h3>
<ul>
  <li><strong>Confirmation #:</strong> {{confirmation_number}}</li>
  <li><strong>Event:</strong> {{event_name}}</li>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Table:</strong> {{table_name}} ({{zone_name}})</li>
  <li><strong>Party Size:</strong> {{party_size}}</li>
  <li><strong>Minimum Spend:</strong> {{currency_symbol}}{{minimum_spend}}</li>
</ul>

{{#if venue_name}}
<h3>Venue</h3>
<p>{{venue_name}}</p>
{{#if venue_address}}<p>{{venue_address}}</p>{{/if}}
{{/if}}

<h3>Arrival Instructions</h3>
<p>Please arrive by {{event_time}} and let the host know you have a table reservation under <strong>{{guest_name}}</strong>.</p>

<p>We look forward to seeing you!</p>',
    'Table Booking Confirmed!

Hi {{guest_name}},

Great news! Your table booking for {{event_name}} has been confirmed.

CONFIRMATION DETAILS
- Confirmation #: {{confirmation_number}}
- Event: {{event_name}}
- Date: {{event_date}}
- Table: {{table_name}} ({{zone_name}})
- Party Size: {{party_size}}
- Minimum Spend: {{currency_symbol}}{{minimum_spend}}

{{#if venue_name}}
VENUE
{{venue_name}}
{{#if venue_address}}{{venue_address}}{{/if}}
{{/if}}

ARRIVAL INSTRUCTIONS
Please arrive by {{event_time}} and let the host know you have a table reservation under {{guest_name}}.

We look forward to seeing you!',
    '{"guest_name": "string", "event_name": "string", "event_date": "string", "event_time": "string", "table_name": "string", "zone_name": "string", "party_size": "string", "minimum_spend": "string", "currency_symbol": "string", "confirmation_number": "string", "venue_name": "string", "venue_address": "string"}'::jsonb
  ),
  (
    'table_booking_cancelled',
    'table_booking.cancelled',
    'guest',
    ARRAY['guest'],
    'Your table booking for {{event_name}} has been cancelled',
    '<h2>Table Booking Cancelled</h2>
<p>Hi {{guest_name}},</p>
<p>Your table booking for <strong>{{event_name}}</strong> has been cancelled.</p>

<h3>Cancelled Booking Details</h3>
<ul>
  <li><strong>Event:</strong> {{event_name}}</li>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Table:</strong> {{table_name}}</li>
</ul>

{{#if cancellation_reason}}
<p><strong>Reason:</strong> {{cancellation_reason}}</p>
{{/if}}

<p>If you have any questions or would like to make a new booking, please contact us.</p>',
    'Table Booking Cancelled

Hi {{guest_name}},

Your table booking for {{event_name}} has been cancelled.

CANCELLED BOOKING DETAILS
- Event: {{event_name}}
- Date: {{event_date}}
- Table: {{table_name}}

{{#if cancellation_reason}}
Reason: {{cancellation_reason}}
{{/if}}

If you have any questions or would like to make a new booking, please contact us.',
    '{"guest_name": "string", "event_name": "string", "event_date": "string", "table_name": "string", "cancellation_reason": "string"}'::jsonb
  ),
  (
    'table_booking_table_changed',
    'table_booking.table_changed',
    'guest',
    ARRAY['guest'],
    'Your table assignment for {{event_name}} has been updated',
    '<h2>Table Assignment Updated</h2>
<p>Hi {{guest_name}},</p>
<p>Your table assignment for <strong>{{event_name}}</strong> has been updated.</p>

<h3>New Table Details</h3>
<ul>
  <li><strong>Event:</strong> {{event_name}}</li>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Previous Table:</strong> {{old_table_name}}</li>
  <li><strong>New Table:</strong> {{new_table_name}} ({{new_zone_name}})</li>
  <li><strong>Minimum Spend:</strong> {{currency_symbol}}{{minimum_spend}}</li>
</ul>

{{#if deposit_changed}}
<p><strong>Note:</strong> The deposit requirement has been updated to {{currency_symbol}}{{new_deposit_amount}}.</p>
{{/if}}

<p>If you have any questions about this change, please contact us.</p>',
    'Table Assignment Updated

Hi {{guest_name}},

Your table assignment for {{event_name}} has been updated.

NEW TABLE DETAILS
- Event: {{event_name}}
- Date: {{event_date}}
- Previous Table: {{old_table_name}}
- New Table: {{new_table_name}} ({{new_zone_name}})
- Minimum Spend: {{currency_symbol}}{{minimum_spend}}

{{#if deposit_changed}}
Note: The deposit requirement has been updated to {{currency_symbol}}{{new_deposit_amount}}.
{{/if}}

If you have any questions about this change, please contact us.',
    '{"guest_name": "string", "event_name": "string", "event_date": "string", "old_table_name": "string", "new_table_name": "string", "new_zone_name": "string", "minimum_spend": "string", "currency_symbol": "string", "deposit_changed": "string", "new_deposit_amount": "string"}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
