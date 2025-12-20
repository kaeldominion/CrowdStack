-- Add gender column to attendees table
ALTER TABLE public.attendees 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN public.attendees.gender IS 'Gender: male or female';

