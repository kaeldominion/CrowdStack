-- Add slug column to promoters for public profile URLs
-- e.g., /p/johnny instead of /p/uuid

-- Add slug column
ALTER TABLE public.promoters
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add profile fields for the public page
ALTER TABLE public.promoters
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_promoters_slug ON public.promoters(slug);

-- Create index for public profile queries
CREATE INDEX IF NOT EXISTS idx_promoters_public ON public.promoters(is_public) WHERE is_public = true;

-- Function to generate a unique slug from promoter name
CREATE OR REPLACE FUNCTION public.generate_promoter_slug(promoter_name TEXT, promoter_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from name (lowercase, replace spaces with hyphens, remove special chars)
  base_slug := lower(regexp_replace(promoter_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- If empty, use 'promoter'
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'promoter';
  END IF;

  -- Limit length
  base_slug := substring(base_slug from 1 for 30);

  -- Check for uniqueness and add number if needed
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.promoters WHERE slug = final_slug AND id != promoter_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- Auto-generate slugs for existing promoters that don't have one
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN SELECT id, name FROM public.promoters WHERE slug IS NULL LOOP
    UPDATE public.promoters
    SET slug = public.generate_promoter_slug(p.name, p.id)
    WHERE id = p.id;
  END LOOP;
END;
$$;

-- Comment for documentation
COMMENT ON COLUMN public.promoters.slug IS 'URL-friendly identifier for public profile (e.g., /p/johnny)';
COMMENT ON COLUMN public.promoters.bio IS 'Short bio displayed on public profile';
COMMENT ON COLUMN public.promoters.profile_image_url IS 'Profile image for public profile';
COMMENT ON COLUMN public.promoters.instagram_handle IS 'Instagram username (without @)';
COMMENT ON COLUMN public.promoters.is_public IS 'Whether the promoter profile is publicly visible';
