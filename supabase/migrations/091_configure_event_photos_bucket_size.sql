-- Configure event-photos bucket with proper file size limit
-- This ensures video fliers up to 50MB can be uploaded by organizers

-- Update the event-photos bucket to have a 52428800 byte (50MB) file size limit
-- Also ensure it's configured for video uploads
UPDATE storage.buckets
SET 
  file_size_limit = 52428800, -- 50MB in bytes
  allowed_mime_types = ARRAY[
    -- Images
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    -- Videos
    'video/mp4', 
    'video/webm', 
    'video/quicktime', 
    'video/x-m4v'
  ]
WHERE id = 'event-photos';

