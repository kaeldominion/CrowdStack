-- Venue Favorites
-- Allows users to favorite venues

CREATE TABLE IF NOT EXISTS public.venue_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_favorites_user_id ON public.venue_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_favorites_venue_id ON public.venue_favorites(venue_id);

-- RLS Policies
ALTER TABLE public.venue_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.venue_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
  ON public.venue_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
  ON public.venue_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all favorites"
  ON public.venue_favorites
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

