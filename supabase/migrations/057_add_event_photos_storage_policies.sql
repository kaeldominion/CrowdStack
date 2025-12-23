-- Add RLS policies for event-photos bucket to allow direct client uploads
-- This enables authenticated organizers to upload video flyers directly from the browser

-- Policy 1: Authenticated organizers can upload to event-photos bucket
-- Specifically for video flyers: events/{eventId}/video-flier/{filename}
CREATE POLICY "Organizers can upload video flyers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-photos'
  AND (
    -- Check if path matches video-flier pattern: events/{eventId}/video-flier/{filename}
    (storage.foldername(name))[1] = 'events'
    AND (storage.foldername(name))[3] = 'video-flier'
    AND (
      -- User is a superadmin
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      -- User is an organizer who owns the event
      EXISTS (
        SELECT 1 FROM public.events e
        INNER JOIN public.organizers o ON o.id = e.organizer_id
        WHERE e.id::text = (storage.foldername(name))[2]
        AND o.created_by = auth.uid()
      )
    )
  )
);

-- Policy 2: Authenticated organizers can update their video flyers
CREATE POLICY "Organizers can update video flyers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND (
    (storage.foldername(name))[1] = 'events'
    AND (storage.foldername(name))[3] = 'video-flier'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.events e
        INNER JOIN public.organizers o ON o.id = e.organizer_id
        WHERE e.id::text = (storage.foldername(name))[2]
        AND o.created_by = auth.uid()
      )
    )
  )
);

-- Policy 3: Authenticated organizers can delete their video flyers
CREATE POLICY "Organizers can delete video flyers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-photos'
  AND (
    (storage.foldername(name))[1] = 'events'
    AND (storage.foldername(name))[3] = 'video-flier'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'superadmin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.events e
        INNER JOIN public.organizers o ON o.id = e.organizer_id
        WHERE e.id::text = (storage.foldername(name))[2]
        AND o.created_by = auth.uid()
      )
    )
  )
);

-- Policy 4: Public can read event photos (already should exist, but ensuring it's there)
CREATE POLICY "Public can read event photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-photos');

