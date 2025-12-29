-- Create DJ Images Storage Bucket
-- This migration creates the dj-images bucket for DJ profile and mix cover images

-- Create dj-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dj-images', 'dj-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for dj-images bucket

-- Public can read DJ images
CREATE POLICY "Public can read DJ images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'dj-images');

-- DJs can upload their own images
-- Path structure: {dj_id}/avatar/{filename}, {dj_id}/cover/{filename}, {dj_id}/mixes/{mix_id}/{filename}
-- Server-side API will verify DJ ownership
CREATE POLICY "DJs can upload own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dj-images'
    AND (
      -- User is a superadmin
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      -- User has a DJ profile (API will verify path matches their dj_id)
      EXISTS (
        SELECT 1 FROM public.djs d
        WHERE d.user_id = auth.uid()
      )
    )
  );

-- DJs can update their own images
CREATE POLICY "DJs can update own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'dj-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.djs d
        WHERE d.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'dj-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.djs d
        WHERE d.user_id = auth.uid()
      )
    )
  );

-- DJs can delete their own images
CREATE POLICY "DJs can delete own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dj-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.djs d
        WHERE d.user_id = auth.uid()
      )
    )
  );

