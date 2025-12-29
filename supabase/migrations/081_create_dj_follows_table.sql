-- Create DJ Follows table
-- This migration creates the dj_follows table for users to follow DJs (similar to venue_favorites)

CREATE TABLE IF NOT EXISTS public.dj_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, dj_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_follows_user_id ON public.dj_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_dj_follows_dj_id ON public.dj_follows(dj_id);

-- Enable RLS
ALTER TABLE public.dj_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own follows
CREATE POLICY "Users can view their own follows"
  ON public.dj_follows
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own follows
CREATE POLICY "Users can insert their own follows"
  ON public.dj_follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own follows
CREATE POLICY "Users can delete their own follows"
  ON public.dj_follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all follows"
  ON public.dj_follows
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

-- Function to get follower count (public access for counts)
CREATE OR REPLACE FUNCTION public.get_dj_follower_count(dj_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.dj_follows
  WHERE dj_id = dj_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON TABLE public.dj_follows IS 'Users following DJs (similar to venue_favorites)';
COMMENT ON FUNCTION public.get_dj_follower_count IS 'Get follower count for a DJ (public access)';

