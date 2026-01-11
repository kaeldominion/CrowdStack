-- Fix table_bookings.promoter_id to reference promoters table instead of auth.users
-- This enables proper joins between table_bookings and promoters

-- Step 1: Drop the existing foreign key constraint (references auth.users)
ALTER TABLE public.table_bookings
DROP CONSTRAINT IF EXISTS table_bookings_promoter_id_fkey;

-- Step 2: Add the correct foreign key constraint to promoters table
ALTER TABLE public.table_bookings
ADD CONSTRAINT table_bookings_promoter_id_fkey
FOREIGN KEY (promoter_id) REFERENCES public.promoters(id) ON DELETE SET NULL;

-- Note: This migration assumes any existing promoter_id values are valid promoter IDs
-- If there are auth.users IDs stored, they would need to be migrated first
