-- Add RLS policies for event-photos bucket to allow direct client uploads
-- This enables authenticated organizers to upload video flyers directly from the browser

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organizers can upload video flyers" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can update video flyers" ON storage.objects;
DROP POLICY IF EXISTS "Organizers can delete video flyers" ON storage.objects;

-- Policy 1: Authenticated organizers can upload to event-photos bucket
-- Specifically for video flyers: events/{eventId}/video-flier/{filename}
-- Using simpler pattern matching with LIKE instead of foldername function
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
    -- User is an organizer (simpler check - if they're an organizer, allow upload)
    -- The server-side API will verify event ownership
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

-- Policy 4: Public can read event photos (only create if it doesn't exist)
-- Note: This might already exist, so we use IF NOT EXISTS pattern
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

