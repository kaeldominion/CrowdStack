-- Event Photos Enhancements
-- Adds fields for photo metadata, blurhash, and cover photo support

-- Add cover photo reference to photo_albums
ALTER TABLE public.photo_albums 
ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL;

-- Add metadata fields to photos
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS blurhash TEXT,
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster photo queries
CREATE INDEX IF NOT EXISTS idx_photos_album_id_order ON public.photos(album_id, display_order);
CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON public.photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_photo_albums_cover_photo ON public.photo_albums(cover_photo_id);

-- Add comment for documentation
COMMENT ON COLUMN public.photos.blurhash IS 'Blurhash string for progressive image loading';
COMMENT ON COLUMN public.photos.uploaded_by IS 'User who uploaded the photo';
COMMENT ON COLUMN public.photo_albums.cover_photo_id IS 'Featured photo for the album cover';

