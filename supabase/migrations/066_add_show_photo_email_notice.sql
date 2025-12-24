-- Add show_photo_email_notice field to events table
-- This allows events to display a notice on the registration success page
-- that photos will be sent via email in a few days

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS show_photo_email_notice BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.events.show_photo_email_notice IS 'If true, shows a notice on registration success page that event photos will be sent via email in a few days';

