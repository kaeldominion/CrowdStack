-- Migration: Update photo_auto_email_on_publish default to true
-- This ensures emails are sent by default when publishing photo albums

-- Update existing albums that still have the old default (false) to the new default (true)
UPDATE public.photo_albums
SET photo_auto_email_on_publish = true
WHERE photo_auto_email_on_publish = false
  AND photo_last_notified_at IS NULL; -- Only update albums that haven't sent notifications yet

-- Change the column default for new albums
ALTER TABLE public.photo_albums
ALTER COLUMN photo_auto_email_on_publish SET DEFAULT true;

