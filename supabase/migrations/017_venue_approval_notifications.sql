-- Venue Authorization Flow + Notifications System
-- This migration adds venue approval for events and a notifications system

-- ============================================
-- EVENTS: Add venue approval fields
-- ============================================

-- Add venue approval columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS venue_approval_status TEXT DEFAULT 'pending' 
  CHECK (venue_approval_status IN ('pending', 'approved', 'rejected', 'not_required'));

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS venue_approval_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS venue_approval_by UUID REFERENCES auth.users(id);

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS venue_rejection_reason TEXT;

-- Set existing events to 'approved' (grandfather them in)
UPDATE public.events SET venue_approval_status = 'approved' WHERE venue_approval_status = 'pending';

-- Events without a venue don't need approval
UPDATE public.events SET venue_approval_status = 'not_required' WHERE venue_id IS NULL;

COMMENT ON COLUMN public.events.venue_approval_status IS 'Venue approval status: pending (awaiting approval), approved, rejected, not_required (no venue)';

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Optional link to navigate to
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications (via API)
-- No explicit policy needed - service role bypasses RLS

-- Superadmins can read all notifications (for debugging)
CREATE POLICY "Superadmins can read all notifications"
  ON public.notifications FOR SELECT
  USING (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: event_pending_approval, event_approved, event_rejected, etc.';
COMMENT ON COLUMN public.notifications.link IS 'Optional link to navigate when notification is clicked';

-- ============================================
-- VENUE-ORGANIZER PARTNERSHIPS (Optional future use)
-- ============================================

-- This table can be used to pre-approve certain organizers for a venue
-- If an organizer is in this table, their events are auto-approved
CREATE TABLE IF NOT EXISTS public.venue_organizer_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  auto_approve BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_org_partnerships_venue ON public.venue_organizer_partnerships(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_org_partnerships_org ON public.venue_organizer_partnerships(organizer_id);

ALTER TABLE public.venue_organizer_partnerships ENABLE ROW LEVEL SECURITY;

-- Venue admins can manage their partnerships
CREATE POLICY "Venue admins can manage their partnerships"
  ON public.venue_organizer_partnerships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_organizer_partnerships.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_organizer_partnerships.venue_id
      AND v.created_by = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_organizer_partnerships.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_organizer_partnerships.venue_id
      AND v.created_by = auth.uid()
    )
    OR public.user_is_superadmin(auth.uid())
  );

-- Organizers can read their own partnerships
CREATE POLICY "Organizers can read their partnerships"
  ON public.venue_organizer_partnerships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = venue_organizer_partnerships.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = venue_organizer_partnerships.organizer_id
      AND o.created_by = auth.uid()
    )
  );

COMMENT ON TABLE public.venue_organizer_partnerships IS 'Pre-approved organizer partnerships for venues. If auto_approve is true, events by this organizer at this venue are automatically approved.';

