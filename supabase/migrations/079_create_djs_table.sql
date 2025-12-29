-- Create DJs table
-- This migration creates the djs table for DJ profiles (one-to-one with users)

CREATE TABLE IF NOT EXISTS public.djs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  genres TEXT[] DEFAULT '{}'::TEXT[],
  location TEXT,
  profile_image_url TEXT,
  cover_image_url TEXT,
  instagram_url TEXT,
  soundcloud_url TEXT,
  mixcloud_url TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_djs_user_id ON public.djs(user_id);
CREATE INDEX IF NOT EXISTS idx_djs_handle ON public.djs(handle);

-- Enable RLS
ALTER TABLE public.djs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public can view DJ profiles
CREATE POLICY "Public can view DJ profiles"
  ON public.djs
  FOR SELECT
  USING (true);

-- DJs can edit their own profile
CREATE POLICY "DJs can edit own profile"
  ON public.djs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DJs can insert their own profile
CREATE POLICY "DJs can insert own profile"
  ON public.djs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Superadmins can do everything
CREATE POLICY "Superadmins can manage all DJ profiles"
  ON public.djs
  FOR ALL
  USING (public.user_is_superadmin(auth.uid()))
  WITH CHECK (public.user_is_superadmin(auth.uid()));

COMMENT ON TABLE public.djs IS 'DJ profiles linked one-to-one with users via user_id';

