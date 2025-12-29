-- Create Mix Plays table (Optional Analytics)
-- This migration creates the mix_plays table for tracking mix play events

CREATE TABLE IF NOT EXISTS public.mix_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_id UUID NOT NULL REFERENCES public.mixes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mix_plays_mix_id ON public.mix_plays(mix_id);
CREATE INDEX IF NOT EXISTS idx_mix_plays_played_at ON public.mix_plays(played_at);

-- Enable RLS
ALTER TABLE public.mix_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can insert plays (track play events)
CREATE POLICY "Public can track mix plays"
  ON public.mix_plays
  FOR INSERT
  WITH CHECK (true);

-- DJs can view plays for their own mixes
CREATE POLICY "DJs can view own mix plays"
  ON public.mix_plays
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mixes m
      INNER JOIN public.djs d ON d.id = m.dj_id
      WHERE m.id = mix_plays.mix_id
      AND d.user_id = auth.uid()
    )
  );

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all mix plays"
  ON public.mix_plays
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.mix_plays IS 'Tracks mix play events for analytics (optional, simple click tracking)';

