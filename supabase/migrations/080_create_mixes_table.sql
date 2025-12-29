-- Create Mixes table
-- This migration creates the mixes table for DJ mixtapes (SoundCloud focus for MVP)

CREATE TABLE IF NOT EXISTS public.mixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dj_id UUID NOT NULL REFERENCES public.djs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  soundcloud_url TEXT NOT NULL,
  soundcloud_embed_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mixes_dj_id ON public.mixes(dj_id);
CREATE INDEX IF NOT EXISTS idx_mixes_status ON public.mixes(status);
CREATE INDEX IF NOT EXISTS idx_mixes_featured ON public.mixes(dj_id, is_featured, display_order) WHERE is_featured = true;

-- Enable RLS
ALTER TABLE public.mixes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view published mixes
CREATE POLICY "Public can view published mixes"
  ON public.mixes
  FOR SELECT
  USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.djs WHERE djs.id = mixes.dj_id AND djs.user_id = auth.uid()
  ));

-- DJs can manage their own mixes
CREATE POLICY "DJs can manage own mixes"
  ON public.mixes
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.djs WHERE djs.id = mixes.dj_id AND djs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.djs WHERE djs.id = mixes.dj_id AND djs.user_id = auth.uid()
  ));

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all mixes"
  ON public.mixes
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.mixes IS 'DJ mixes/mixtapes, focusing on SoundCloud for MVP';

