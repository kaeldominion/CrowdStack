-- Migrate Venue Music Tags to New Genre System
-- Maps old genre values to new curated genre list
-- ============================================

-- Map old genre values to new ones
UPDATE public.venue_tags
SET tag_value = CASE
  -- Map "Electronic" to "EDM" (broader electronic category)
  WHEN tag_value = 'Electronic' THEN 'EDM'
  -- Map "Rock" to "Live Music" (rock is typically live performance)
  WHEN tag_value = 'Rock' THEN 'Live Music'
  -- Map removed genres to their parent categories
  WHEN tag_value = 'Trap' THEN 'Hip-Hop'
  WHEN tag_value = 'Reggaeton' THEN 'Latin'
  WHEN tag_value = 'Dancehall' THEN 'Latin'
  WHEN tag_value = 'Reggae' THEN 'Latin'
  WHEN tag_value = 'Top 40' THEN 'Pop'
  WHEN tag_value = 'Throwbacks' THEN 'Pop'
  -- All other values should already be valid or will be left as-is
  ELSE tag_value
END
WHERE tag_type = 'music'
AND tag_value IN ('Electronic', 'Rock', 'Trap', 'Reggaeton', 'Dancehall', 'Reggae', 'Top 40', 'Throwbacks');

-- Note: If there are any other invalid music tags, they will remain in the database
-- but won't show up in the UI (which only shows VENUE_EVENT_GENRES options)
-- Venue admins can manually update them through the settings page

COMMENT ON TABLE public.venue_tags IS 'Tags for venue categorization. Music tags should use values from VENUE_EVENT_GENRES constant.';

