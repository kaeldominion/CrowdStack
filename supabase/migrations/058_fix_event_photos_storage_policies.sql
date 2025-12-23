-- Fix and ensure event-photos storage policies are correct
-- This migration checks existing policies and recreates them if needed

-- First, drop ALL existing policies for event-photos bucket to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname IN (
            'Organizers can upload video flyers',
            'Organizers can update video flyers',
            'Organizers can delete video flyers',
            'Public can read event photos',
            'Authenticated users can upload event photos'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Authenticated organizers can upload video flyers
-- Using simple pattern matching and organizer check
CREATE POLICY "Organizers can upload video flyers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos'
  AND name LIKE 'events/%/video-flier/%'
  AND (
    -- User is a superadmin
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
    OR
    -- User is an organizer
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.created_by = auth.uid()
    )
  )
);

-- Policy 2: Authenticated organizers can update their video flyers
CREATE POLICY "Organizers can update video flyers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND name LIKE 'events/%/video-flier/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.created_by = auth.uid()
    )
  )
);

-- Policy 3: Authenticated organizers can delete their video flyers
CREATE POLICY "Organizers can delete video flyers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND name LIKE 'events/%/video-flier/%'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.created_by = auth.uid()
    )
  )
);

-- Policy 4: Public can read event photos
-- Only create if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can read event photos'
  ) THEN
    CREATE POLICY "Public can read event photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'event-photos');
  END IF;
END $$;

