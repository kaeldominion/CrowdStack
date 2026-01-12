-- Check Table Bookings
-- This script shows all table bookings with key status and payment information

-- View ALL table bookings with key fields (remove LIMIT to see all)
SELECT 
  id,
  status,
  payment_status,
  deposit_received,
  deposit_received_at,
  deposit_required,
  guest_name,
  guest_email,
  party_size,
  created_at,
  updated_at,
  confirmed_at,
  event_id,
  table_id
FROM public.table_bookings
ORDER BY created_at DESC;

-- Check specific booking (replace with your booking ID)
SELECT 
  id,
  status,
  payment_status,
  deposit_received,
  deposit_received_at,
  deposit_required,
  guest_name,
  guest_email,
  guest_whatsapp,
  party_size,
  created_at,
  updated_at,
  confirmed_at,
  confirmed_by,
  event_id,
  table_id,
  staff_notes
FROM public.table_bookings
WHERE id = '9bf3bfb7-0a8b-45e2-bab1-219c626ce58f';

-- Check ALL bookings with event and table info (this is the most useful query)
SELECT 
  tb.id,
  tb.status,
  tb.payment_status,
  tb.deposit_received,
  tb.deposit_required,
  tb.guest_name,
  tb.guest_email,
  e.name AS event_name,
  e.start_time AS event_start,
  vt.name AS table_name,
  tz.name AS zone_name,
  tb.created_at,
  tb.updated_at,
  tb.confirmed_at,
  tb.confirmed_by
FROM public.table_bookings tb
LEFT JOIN public.events e ON tb.event_id = e.id
LEFT JOIN public.venue_tables vt ON tb.table_id = vt.id
LEFT JOIN public.table_zones tz ON vt.zone_id = tz.id
WHERE tb.archived_at IS NULL  -- Exclude archived bookings
ORDER BY tb.created_at DESC;

-- Check for the specific booking with full details
SELECT 
  tb.*,
  e.name AS event_name,
  e.slug AS event_slug,
  vt.name AS table_name,
  tz.name AS zone_name
FROM public.table_bookings tb
LEFT JOIN public.events e ON tb.event_id = e.id
LEFT JOIN public.venue_tables vt ON tb.table_id = vt.id
LEFT JOIN public.table_zones tz ON vt.zone_id = tz.id
WHERE tb.id = '9bf3bfb7-0a8b-45e2-bab1-219c626ce58f';

-- Check party guests for a specific booking
SELECT 
  id,
  booking_id,
  guest_name,
  guest_email,
  is_host,
  status,
  invite_token,
  qr_token,
  checked_in,
  joined_at,
  created_at
FROM public.table_party_guests
WHERE booking_id = '9bf3bfb7-0a8b-45e2-bab1-219c626ce58f'
ORDER BY is_host DESC, created_at ASC;
