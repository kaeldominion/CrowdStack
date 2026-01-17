-- Fix Table Booking Host Guest Creation
-- This migration ensures host guest records are automatically created when a booking is confirmed
-- Previously, host guests were only created when the user visited the booking page

-- ============================================
-- 1. CREATE TRIGGER FUNCTION FOR AUTO HOST GUEST CREATION
-- ============================================

CREATE OR REPLACE FUNCTION public.create_host_guest_on_booking_confirm()
RETURNS TRIGGER AS $$
DECLARE
  v_attendee_id UUID;
BEGIN
  -- Only trigger when booking status changes to 'confirmed' or payment_status changes to 'paid'
  IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed'))
     OR (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')) THEN

    -- Try to find existing attendee by email
    SELECT id INTO v_attendee_id
    FROM public.attendees
    WHERE email = LOWER(NEW.guest_email)
    LIMIT 1;

    -- Create host guest record if it doesn't exist
    INSERT INTO public.table_party_guests (
      booking_id,
      attendee_id,
      guest_name,
      guest_email,
      guest_phone,
      is_host,
      status,
      joined_at
    ) VALUES (
      NEW.id,
      v_attendee_id,
      NEW.guest_name,
      LOWER(NEW.guest_email),
      NEW.guest_whatsapp,
      TRUE,
      'joined',
      NOW()
    )
    ON CONFLICT (booking_id, guest_email) DO UPDATE SET
      is_host = TRUE,
      status = 'joined',
      joined_at = COALESCE(table_party_guests.joined_at, NOW()),
      attendee_id = COALESCE(table_party_guests.attendee_id, EXCLUDED.attendee_id),
      updated_at = NOW();

    RAISE LOG '[Table Booking] Auto-created host guest for booking % (email: %)', NEW.id, NEW.guest_email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CREATE TRIGGER ON TABLE_BOOKINGS
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_host_guest_on_booking_confirm ON public.table_bookings;

CREATE TRIGGER trigger_create_host_guest_on_booking_confirm
  AFTER INSERT OR UPDATE OF status, payment_status
  ON public.table_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_host_guest_on_booking_confirm();

-- ============================================
-- 3. BACKFILL: Create host guests for existing confirmed bookings
-- ============================================

-- Create host guest records for any confirmed bookings that don't have one
INSERT INTO public.table_party_guests (
  booking_id,
  attendee_id,
  guest_name,
  guest_email,
  guest_phone,
  is_host,
  status,
  joined_at
)
SELECT
  tb.id AS booking_id,
  a.id AS attendee_id,
  tb.guest_name,
  LOWER(tb.guest_email) AS guest_email,
  tb.guest_whatsapp AS guest_phone,
  TRUE AS is_host,
  'joined' AS status,
  COALESCE(tb.confirmed_at, tb.created_at) AS joined_at
FROM public.table_bookings tb
LEFT JOIN public.attendees a ON LOWER(a.email) = LOWER(tb.guest_email)
WHERE (tb.status = 'confirmed' OR tb.payment_status = 'paid')
  AND NOT EXISTS (
    SELECT 1 FROM public.table_party_guests tpg
    WHERE tpg.booking_id = tb.id AND tpg.is_host = TRUE
  )
ON CONFLICT (booking_id, guest_email) DO UPDATE SET
  is_host = TRUE,
  status = 'joined',
  joined_at = COALESCE(table_party_guests.joined_at, EXCLUDED.joined_at),
  updated_at = NOW();

-- ============================================
-- 4. ADD INDEX FOR FASTER HOST GUEST LOOKUPS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_table_party_guests_is_host
  ON public.table_party_guests(booking_id, is_host)
  WHERE is_host = TRUE;

-- ============================================
-- 5. COMMENT FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION public.create_host_guest_on_booking_confirm() IS
'Automatically creates a host guest record in table_party_guests when a booking is confirmed or payment is received. This ensures the host always has a party guest record for QR code generation.';
