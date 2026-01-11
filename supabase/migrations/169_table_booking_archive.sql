-- Add archived_at column to table_bookings for soft delete
-- ============================================

ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Add archived_by column to track who archived it
ALTER TABLE public.table_bookings
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create index for filtering out archived bookings
CREATE INDEX IF NOT EXISTS idx_table_bookings_archived ON public.table_bookings(archived_at)
WHERE archived_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.table_bookings.archived_at IS 'When set, the booking is considered archived/deleted but preserved for historical records';
COMMENT ON COLUMN public.table_bookings.archived_by IS 'The user who archived this booking';
