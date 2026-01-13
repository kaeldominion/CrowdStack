-- Rename events.capacity to max_guestlist_size
-- This clarifies that this field represents the maximum number of guestlist registrations,
-- not the venue's physical capacity

ALTER TABLE public.events
RENAME COLUMN capacity TO max_guestlist_size;

COMMENT ON COLUMN public.events.max_guestlist_size IS 'Maximum number of guestlist registrations allowed for this event. Separate from venue physical capacity.';
