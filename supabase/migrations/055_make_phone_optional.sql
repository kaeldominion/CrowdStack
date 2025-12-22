-- Make phone optional in attendees table
-- Previously phone was NOT NULL which prevented profile creation without WhatsApp

-- Drop the NOT NULL constraint on phone
ALTER TABLE public.attendees 
ALTER COLUMN phone DROP NOT NULL;

-- Drop the unique constraint on phone (need to recreate as partial index)
ALTER TABLE public.attendees 
DROP CONSTRAINT IF EXISTS attendees_phone_key;

-- Create partial unique index for phone (only when phone is not null and not empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_phone_unique 
  ON public.attendees(phone) 
  WHERE phone IS NOT NULL AND phone != '';

COMMENT ON COLUMN public.attendees.phone IS 'Phone number - optional, unique when provided';


