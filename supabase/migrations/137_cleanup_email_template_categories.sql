-- Cleanup Email Template Categories
-- Additional cleanup for email template categories to ensure proper organization
-- This migration is idempotent and safe to run multiple times
-- ============================================

-- Step 1: Drop the existing check constraint (allows us to update categories)
ALTER TABLE public.email_templates
DROP CONSTRAINT IF EXISTS email_templates_category_check;

-- Step 2: Clean up any remaining 'event_lifecycle' category references
-- (Migration 121 should have handled this, but ensuring completeness)

UPDATE public.email_templates
SET category = 'event_invites'
WHERE category = 'event_lifecycle' 
  AND slug IN ('event_invite', 'promoter_event_assigned');

UPDATE public.email_templates
SET category = 'payout'
WHERE category = 'event_lifecycle' 
  AND slug = 'promoter_terms_updated';

-- Catch-all: Any remaining 'event_lifecycle' goes to 'event_invites' as default
UPDATE public.email_templates
SET category = 'event_invites'
WHERE category = 'event_lifecycle';

-- Step 3: Ensure all templates are in correct categories (idempotent updates)

-- Auth Onboarding (Welcome emails, role assignments)
UPDATE public.email_templates
SET category = 'auth_onboarding'
WHERE slug IN (
  'welcome',
  'venue_admin_welcome',
  'event_organizer_welcome',
  'promoter_welcome',
  'dj_welcome'
);

-- Event Registration
UPDATE public.email_templates
SET category = 'event_registration'
WHERE slug = 'registration_confirmation';

-- Event Reminders (All event reminder emails)
UPDATE public.email_templates
SET category = 'event_reminders'
WHERE slug = 'event_reminder_6h';

-- DJ Gigs (All DJ-related emails - invitations, confirmations, reminders)
UPDATE public.email_templates
SET category = 'dj_gigs'
WHERE slug IN (
  'dj_gig_invitation',
  'dj_gig_confirmed',
  'dj_gig_reminder_24h',
  'dj_gig_reminder_4h'
);

-- Event Photos (Photo notifications and published photos)
UPDATE public.email_templates
SET category = 'event_photos'
WHERE slug IN (
  'photo_notification',
  'photos_published'
);

-- Event Invites (Event invitations and promoter assignments)
UPDATE public.email_templates
SET category = 'event_invites'
WHERE slug IN (
  'event_invite',
  'promoter_event_assigned'
);

-- Payout (All payout-related emails including terms updates)
UPDATE public.email_templates
SET category = 'payout'
WHERE slug IN (
  'promoter_terms_updated',
  'payout_ready',
  'payment_received'
);

-- Bonus (Bonus progress and achievement notifications)
UPDATE public.email_templates
SET category = 'bonus'
WHERE slug IN (
  'bonus_progress_80',
  'bonus_achieved'
);

-- Step 4: Re-add check constraint with all valid categories
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

-- Add comment explaining categories
COMMENT ON CONSTRAINT email_templates_category_check ON public.email_templates IS 
'Categories for organizing email templates in admin UI:
- auth_onboarding: Welcome emails and role assignment notifications
- event_registration: Event registration confirmations
- event_reminders: Event reminder emails (6h before, etc.)
- dj_gigs: DJ gig-related emails (invitations, confirmations, reminders)
- event_photos: Photo gallery notifications and published photo emails
- event_invites: Event invitation emails and promoter event assignments
- payout: Payout-related emails (ready, received, terms updates)
- bonus: Bonus progress and achievement notifications
- guest: Guest-related emails (reserved for future use)
- venue: Venue-related emails (reserved for future use)
- system: System/admin emails (reserved for future use)';
