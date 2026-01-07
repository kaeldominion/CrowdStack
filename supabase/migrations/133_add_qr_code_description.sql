-- Add description field to dynamic_qr_codes table
ALTER TABLE public.dynamic_qr_codes
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.dynamic_qr_codes.description IS 'Optional detailed description for the QR code';

