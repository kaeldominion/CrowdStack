-- Create DJ Gallery table
-- Allows DJs to have multiple gallery images (similar to venue_gallery)

CREATE TABLE IF NOT EXISTS public.dj_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  is_hero BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dj_gallery_dj_id ON public.dj_gallery(dj_id);
CREATE INDEX IF NOT EXISTS idx_dj_gallery_hero ON public.dj_gallery(dj_id, is_hero) WHERE is_hero = TRUE;
CREATE INDEX IF NOT EXISTS idx_dj_gallery_display_order ON public.dj_gallery(dj_id, display_order);

-- Enable RLS
ALTER TABLE public.dj_gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view DJ gallery images
CREATE POLICY "Public can view DJ gallery"
  ON public.dj_gallery FOR SELECT
  USING (true);

-- DJs can manage their own gallery (if they have a user_id)
CREATE POLICY "DJs can manage own gallery"
  ON public.dj_gallery FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.djs
      WHERE djs.id = dj_gallery.dj_id
      AND djs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.djs
      WHERE djs.id = dj_gallery.dj_id
      AND djs.user_id = auth.uid()
    )
  );

-- Superadmins can manage all DJ galleries
CREATE POLICY "Superadmins can manage all DJ galleries"
  ON public.dj_gallery FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.dj_gallery IS 'Gallery images for DJ profiles';



