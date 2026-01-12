-- Venue Pulse Feedback System
-- Implements private feedback collection system for events
-- ============================================

-- ============================================
-- 1. FEEDBACK CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_feedback_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.event_feedback_categories IS 'Predefined categories for negative feedback (door, staff, music, etc.)';
COMMENT ON COLUMN public.event_feedback_categories.code IS 'Unique code identifier (e.g., door_entry, staff, music)';
COMMENT ON COLUMN public.event_feedback_categories.label IS 'Human-readable label (e.g., Door / entry, Staff)';

-- Seed feedback categories
INSERT INTO public.event_feedback_categories (code, label, display_order) VALUES
  ('door_entry', 'Door / entry', 1),
  ('staff', 'Staff', 2),
  ('tables_service', 'Tables / service', 3),
  ('music', 'Music', 4),
  ('crowd', 'Crowd', 5),
  ('other', 'Other', 6)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. FEEDBACK SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_feedback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  delay_hours INTEGER DEFAULT 24 NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_entity_per_setting CHECK (
    (venue_id IS NOT NULL AND organizer_id IS NULL) OR
    (venue_id IS NULL AND organizer_id IS NOT NULL)
  )
);

-- Unique constraint: one setting per venue, one per organizer
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_venue 
  ON public.event_feedback_settings(venue_id) 
  WHERE venue_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_organizer 
  ON public.event_feedback_settings(organizer_id) 
  WHERE organizer_id IS NOT NULL;

COMMENT ON TABLE public.event_feedback_settings IS 'Per-venue or per-organizer feedback configuration';
COMMENT ON COLUMN public.event_feedback_settings.delay_hours IS 'Hours after event close to send feedback request (default: 24)';
COMMENT ON COLUMN public.event_feedback_settings.enabled IS 'Whether feedback collection is enabled for this venue/organizer';

-- ============================================
-- 3. FEEDBACK REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  feedback_id UUID, -- Will reference event_feedback after it's created
  token TEXT NOT NULL UNIQUE, -- Secure token for feedback link
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_requests_registration 
  ON public.event_feedback_requests(registration_id);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_event_id 
  ON public.event_feedback_requests(event_id);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_user_id 
  ON public.event_feedback_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_token 
  ON public.event_feedback_requests(token);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_token_expires 
  ON public.event_feedback_requests(token_expires_at) 
  WHERE token_expires_at > NOW();

COMMENT ON TABLE public.event_feedback_requests IS 'Tracks feedback requests sent to attendees';
COMMENT ON COLUMN public.event_feedback_requests.token IS 'Secure token for feedback link (expires after 7 days)';
COMMENT ON COLUMN public.event_feedback_requests.feedback_id IS 'Set when feedback is submitted (links to event_feedback)';

-- ============================================
-- 4. FEEDBACK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.event_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  attendee_id UUID REFERENCES public.attendees(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT, -- Optional comment for positive feedback (4-5 stars)
  categories JSONB DEFAULT '[]'::jsonb, -- Array of category codes for negative feedback (1-3 stars)
  free_text TEXT, -- Optional detailed feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_event_id 
  ON public.event_feedback(event_id);

CREATE INDEX IF NOT EXISTS idx_feedback_attendee_id 
  ON public.event_feedback(attendee_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id 
  ON public.event_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_rating 
  ON public.event_feedback(rating);

CREATE INDEX IF NOT EXISTS idx_feedback_type 
  ON public.event_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at 
  ON public.event_feedback(submitted_at DESC);

COMMENT ON TABLE public.event_feedback IS 'Private feedback from verified attendees (not public)';
COMMENT ON COLUMN public.event_feedback.rating IS 'Star rating 1-5';
COMMENT ON COLUMN public.event_feedback.comment IS 'Optional comment for positive feedback (4-5 stars)';
COMMENT ON COLUMN public.event_feedback.categories IS 'Array of category codes for negative feedback (1-3 stars)';
COMMENT ON COLUMN public.event_feedback.feedback_type IS 'positive (4-5 stars) or negative (1-3 stars)';

-- Add foreign key constraint for feedback_id in event_feedback_requests
ALTER TABLE public.event_feedback_requests
ADD CONSTRAINT fk_feedback_requests_feedback_id 
  FOREIGN KEY (feedback_id) 
  REFERENCES public.event_feedback(id) 
  ON DELETE SET NULL;

-- ============================================
-- 5. EMAIL TEMPLATE
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

-- Insert feedback request email template
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
  'feedback_request',
  'event.feedback_request',
  'system',
  ARRAY['attendee'],
  'Thanks for attending {{event_name}}. How was your experience?',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your experience?</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Thanks for attending!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
        Hi{{attendee_name}},
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
        Thanks for attending <strong>{{event_name}}</strong>{{venue_name}}.
      </p>
      
      <p style="font-size: 16px; margin-bottom: 30px; color: #333;">
        How was your experience? We''d love to hear your feedback.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{feedback_link}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
          Share Your Feedback
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
        This link will expire in 7 days.
      </p>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        Best regards,<br>
        The CrowdStack Team
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This email was sent by CrowdStack, not the venue.
      </p>
    </div>
  </div>
</body>
</html>',
  'Thanks for attending!

Hi{{attendee_name}},

Thanks for attending {{event_name}}{{venue_name}}.

How was your experience? We''d love to hear your feedback.

Share your feedback: {{feedback_link}}

This link will expire in 7 days.

Best regards,
The CrowdStack Team

---
This email was sent by CrowdStack, not the venue.',
  '{"event_name": "string", "venue_name": "string", "attendee_name": "string", "feedback_link": "string"}'::jsonb,
  true,
  public.get_first_superadmin()
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedback_categories_code 
  ON public.event_feedback_categories(code);

CREATE INDEX IF NOT EXISTS idx_feedback_categories_display_order 
  ON public.event_feedback_categories(display_order);

CREATE INDEX IF NOT EXISTS idx_feedback_settings_venue_id 
  ON public.event_feedback_settings(venue_id) 
  WHERE venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_settings_organizer_id 
  ON public.event_feedback_settings(organizer_id) 
  WHERE organizer_id IS NOT NULL;

-- ============================================
-- 7. ENABLE RLS
-- ============================================

ALTER TABLE public.event_feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Feedback categories: Public read (for UI)
CREATE POLICY "Anyone can read feedback categories"
  ON public.event_feedback_categories FOR SELECT
  USING (true);

-- Feedback settings: Venue admins can read/update their settings
CREATE POLICY "Venue admins can manage their feedback settings"
  ON public.event_feedback_settings FOR ALL
  USING (
    venue_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id
      AND v.created_by = auth.uid()
    )
  )
  WITH CHECK (
    venue_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id
      AND v.created_by = auth.uid()
    )
  );

-- Organizers can manage their feedback settings
CREATE POLICY "Organizers can manage their feedback settings"
  ON public.event_feedback_settings FOR ALL
  USING (
    organizer_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_id
      AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    organizer_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Feedback requests: Users can read their own requests
CREATE POLICY "Users can read their own feedback requests"
  ON public.event_feedback_requests FOR SELECT
  USING (user_id = auth.uid());

-- Venue admins can read feedback requests for their venue''s events
CREATE POLICY "Venue admins can read feedback requests for their events"
  ON public.event_feedback_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      WHERE e.id = event_feedback_requests.event_id
      AND v.created_by = auth.uid()
    )
  );

-- Organizers can read feedback requests for their events
CREATE POLICY "Organizers can read feedback requests for their events"
  ON public.event_feedback_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      WHERE e.id = event_feedback_requests.event_id
      AND o.created_by = auth.uid()
    )
  );

-- Feedback: Users can read their own feedback
CREATE POLICY "Users can read their own feedback"
  ON public.event_feedback FOR SELECT
  USING (user_id = auth.uid());

-- Venue admins can read feedback for their venue''s events
CREATE POLICY "Venue admins can read feedback for their events"
  ON public.event_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      WHERE e.id = event_feedback.event_id
      AND v.created_by = auth.uid()
    )
  );

-- Organizers can read feedback for their events
CREATE POLICY "Organizers can read feedback for their events"
  ON public.event_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON e.organizer_id = o.id
      WHERE e.id = event_feedback.event_id
      AND o.created_by = auth.uid()
    )
  );

-- Users can insert their own feedback (via token validation in API)
CREATE POLICY "Users can insert their own feedback"
  ON public.event_feedback FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 9. FUNCTION TO QUEUE FEEDBACK REQUESTS
-- ============================================

CREATE OR REPLACE FUNCTION public.queue_feedback_requests_for_event(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_queued_count INTEGER := 0;
  v_registration RECORD;
  v_attendee RECORD;
  v_event RECORD;
  v_settings RECORD;
  v_delay_hours INTEGER;
  v_token TEXT;
  v_token_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get event details
  SELECT e.*, v.id as venue_id, o.id as organizer_id
  INTO v_event
  FROM public.events e
  LEFT JOIN public.venues v ON e.venue_id = v.id
  LEFT JOIN public.organizers o ON e.organizer_id = o.id
  WHERE e.id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;
  
  -- Get feedback settings (venue takes precedence over organizer)
  IF v_event.venue_id IS NOT NULL THEN
    SELECT * INTO v_settings
    FROM public.event_feedback_settings
    WHERE venue_id = v_event.venue_id;
  END IF;
  
  IF v_settings IS NULL AND v_event.organizer_id IS NOT NULL THEN
    SELECT * INTO v_settings
    FROM public.event_feedback_settings
    WHERE organizer_id = v_event.organizer_id;
  END IF;
  
  -- Use default delay if no settings found
  IF v_settings IS NULL OR NOT v_settings.enabled THEN
    -- Feedback disabled or no settings - return 0
    RETURN 0;
  END IF;
  
  v_delay_hours := COALESCE(v_settings.delay_hours, 24);
  
  -- Find all checked-in attendees with user accounts
  FOR v_registration IN
    SELECT DISTINCT r.id, r.attendee_id, r.event_id
    FROM public.registrations r
    INNER JOIN public.checkins c ON c.registration_id = r.id
    INNER JOIN public.attendees a ON a.id = r.attendee_id
    WHERE r.event_id = p_event_id
      AND c.undo_at IS NULL -- Not undone
      AND a.user_id IS NOT NULL -- Has user account
      AND NOT EXISTS (
        SELECT 1 FROM public.event_feedback_requests efr
        WHERE efr.registration_id = r.id
      ) -- Not already requested
  LOOP
    -- Get attendee details
    SELECT * INTO v_attendee
    FROM public.attendees
    WHERE id = v_registration.attendee_id;
    
    -- Generate secure token (UUID-based)
    v_token := gen_random_uuid()::TEXT;
    v_token_expires_at := NOW() + INTERVAL '7 days';
    
    -- Insert feedback request
    INSERT INTO public.event_feedback_requests (
      registration_id,
      event_id,
      user_id,
      token,
      token_expires_at
    ) VALUES (
      v_registration.id,
      v_registration.event_id,
      v_attendee.user_id,
      v_token,
      v_token_expires_at
    );
    
    v_queued_count := v_queued_count + 1;
  END LOOP;
  
  RETURN v_queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.queue_feedback_requests_for_event IS 'Queues feedback requests for all checked-in attendees with user accounts for a given event';

-- ============================================
-- 10. TRIGGER TO AUTO-QUEUE ON EVENT CLOSE
-- ============================================

CREATE OR REPLACE FUNCTION public.on_event_close()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if closed_at was just set (was NULL, now has value)
  IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN
    -- Queue feedback requests (will be processed by background job based on delay)
    PERFORM public.queue_feedback_requests_for_event(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_event_close_feedback
  AFTER UPDATE ON public.events
  FOR EACH ROW
  WHEN (OLD.closed_at IS DISTINCT FROM NEW.closed_at)
  EXECUTE FUNCTION public.on_event_close();

COMMENT ON TRIGGER trigger_event_close_feedback ON public.events IS 'Automatically queues feedback requests when event is closed';
