-- Comprehensive Activity Logs System
-- Tracks all user actions across the platform for audit, debugging, and analytics

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'event', 'attendee', 'promoter', 'organizer', 'venue', 'registration', 'checkin', 'photo', etc.
  entity_id UUID, -- ID of the entity being acted upon
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (e.g., old/new values, reason, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON public.activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_entity ON public.activity_logs(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_created ON public.activity_logs(entity_type, entity_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users can see their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid());

-- Organizers can see activity logs for their events
CREATE POLICY "Organizers can view activity logs for their events"
  ON public.activity_logs FOR SELECT
  USING (
    entity_type = 'event' AND
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizer_users ou ON ou.organizer_id = e.organizer_id
      WHERE e.id = activity_logs.entity_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = activity_logs.entity_id
      AND o.created_by = auth.uid()
    )
  );

-- Venue admins can see activity logs for events at their venues
CREATE POLICY "Venue admins can view activity logs for their venue events"
  ON public.activity_logs FOR SELECT
  USING (
    entity_type = 'event' AND
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venue_users vu ON vu.venue_id = e.venue_id
      WHERE e.id = activity_logs.entity_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = activity_logs.entity_id
      AND v.created_by = auth.uid()
    )
  );

-- Promoters can see activity logs for events they're assigned to
CREATE POLICY "Promoters can view activity logs for their assigned events"
  ON public.activity_logs FOR SELECT
  USING (
    entity_type = 'event' AND
    EXISTS (
      SELECT 1 FROM public.event_promoters ep
      JOIN public.promoters p ON p.id = ep.promoter_id
      WHERE ep.event_id = activity_logs.entity_id
      AND (p.user_id = auth.uid() OR p.created_by = auth.uid())
    )
  );

-- Superadmins can see all activity logs
CREATE POLICY "Superadmins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

-- Service role can insert activity logs (for API endpoints)
CREATE POLICY "Service role can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Users can insert their own activity logs (for client-side tracking)
CREATE POLICY "Users can insert their own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: Log Activity
-- ============================================

CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    metadata,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.activity_logs IS 'Comprehensive activity log for all user actions across the platform';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Type of action: register, checkin, edit, create, delete, publish, approve, reject, share, view, etc.';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Type of entity: event, attendee, promoter, organizer, venue, registration, checkin, photo, etc.';
COMMENT ON COLUMN public.activity_logs.metadata IS 'Additional context as JSON: { old_value, new_value, reason, description, etc. }';
COMMENT ON FUNCTION log_activity IS 'Helper function to log an activity. Can be called from triggers or application code.';

