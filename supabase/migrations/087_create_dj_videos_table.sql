-- Create DJ Videos table
-- Stores YouTube video links for DJ profiles

CREATE TABLE IF NOT EXISTS public.dj_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT, -- Extracted from YouTube URL
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_videos_dj_id ON public.dj_videos(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_videos_featured ON public.dj_videos(dj_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_dj_videos_display_order ON public.dj_videos(dj_id, display_order);

-- Enable RLS
ALTER TABLE public.dj_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view DJ videos
CREATE POLICY "Public can view DJ videos"
  ON public.dj_videos FOR SELECT
  USING (true);

-- DJs can manage their own videos (if they have a user_id)
CREATE POLICY "DJs can manage own videos"
  ON public.dj_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.djs
      WHERE djs.id = dj_videos.dj_id
      AND djs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.djs
      WHERE djs.id = dj_videos.dj_id
      AND djs.user_id = auth.uid()
    )
  );

-- Superadmins can manage all DJ videos
CREATE POLICY "Superadmins can manage all DJ videos"
  ON public.dj_videos FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.dj_videos IS 'YouTube videos for DJ profiles';



