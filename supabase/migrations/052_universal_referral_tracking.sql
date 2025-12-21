-- Universal Referral Tracking System
-- Allows any user (not just promoters) to track referrals and link shares

-- Add referred_by_user_id column to registrations table
-- This tracks which user (any auth user) referred this registration
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.registrations.referred_by_user_id IS 'User ID of the person who shared the link that led to this registration. Can be any authenticated user, not just promoters.';

-- Create referral_clicks table to track link clicks
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_fingerprint TEXT, -- Anonymous identifier (IP hash + User Agent)
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_at TIMESTAMP WITH TIME ZONE, -- When they registered (nullable)
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL, -- Link to conversion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_clicks_event_id ON public.referral_clicks(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer_user_id ON public.referral_clicks(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_clicked_at ON public.referral_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_converted_at ON public.referral_clicks(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_referred_by_user_id ON public.registrations(referred_by_user_id) WHERE referred_by_user_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.referral_clicks IS 'Tracks clicks on shared referral links. Records when someone clicks a link shared by a user, and optionally when that click converts to a registration.';
COMMENT ON COLUMN public.referral_clicks.visitor_fingerprint IS 'Anonymous identifier combining IP address hash and user agent to track unique visitors without storing PII.';
COMMENT ON COLUMN public.referral_clicks.converted_at IS 'Timestamp when this click resulted in a registration. NULL if not yet converted.';

