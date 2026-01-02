-- Refine Email Template Categories
-- Add more specific categories to better organize email templates
-- ============================================

-- First, drop the existing check constraint
ALTER TABLE public.email_templates
DROP CONSTRAINT IF EXISTS email_templates_category_check;

-- Add new check constraint with refined categories
ALTER TABLE public.email_templates
ADD CONSTRAINT email_templates_category_check CHECK (category IN (
  'auth_onboarding',      -- Welcome emails, role assignments
  'event_registration',   -- Registration confirmations
  'event_reminders',      -- Event reminders (6h before, etc.)
  'dj_gigs',              -- DJ gig invitations, confirmations, reminders
  'event_photos',         -- Photo published notifications
  'event_invites',        -- Event invite emails, promoter assignments
  'payout',               -- Payout-related emails, terms updates
  'bonus',                -- Bonus-related emails
  'guest',                -- Guest-related emails
  'venue',                -- Venue-related emails
  'system'                -- System/admin emails
));

-- Update existing templates to use new categories
UPDATE public.email_templates
SET category = 'event_registration'
WHERE slug = 'registration_confirmation';

UPDATE public.email_templates
SET category = 'event_reminders'
WHERE slug = 'event_reminder_6h';

UPDATE public.email_templates
SET category = 'dj_gigs'
WHERE slug IN ('dj_gig_invitation', 'dj_gig_confirmed', 'dj_gig_reminder_24h', 'dj_gig_reminder_4h');

UPDATE public.email_templates
SET category = 'event_photos'
WHERE slug = 'photo_notification';

UPDATE public.email_templates
SET category = 'event_invites'
WHERE slug IN ('event_invite', 'promoter_event_assigned');

UPDATE public.email_templates
SET category = 'payout'
WHERE slug = 'promoter_terms_updated';

-- Add comment explaining categories
COMMENT ON CONSTRAINT email_templates_category_check ON public.email_templates IS 
'Categories for organizing email templates:
- auth_onboarding: Welcome emails, role assignments
- event_registration: Registration confirmations
- event_reminders: Event reminders (6h before, etc.)
- dj_gigs: DJ gig invitations, confirmations, reminders
- event_photos: Photo published notifications
- event_invites: Event invite emails, promoter assignments
- payout: Payout-related emails, terms updates
- bonus: Bonus-related emails
- guest: Guest-related emails
- venue: Venue-related emails
- system: System/admin emails';

