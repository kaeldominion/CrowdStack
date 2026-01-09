-- Add whatsapp_number to promoters table for contact info

ALTER TABLE public.promoters
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.promoters.whatsapp_number IS 'WhatsApp number for contact (including country code)';
