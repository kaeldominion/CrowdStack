-- Create healthcheck table for connectivity testing
CREATE TABLE IF NOT EXISTS public.healthcheck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default row for health checks
INSERT INTO public.healthcheck (id) VALUES (gen_random_uuid())
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.healthcheck ENABLE ROW LEVEL SECURITY;

-- Allow public read access for health checks
CREATE POLICY "Allow public read access for health checks"
  ON public.healthcheck
  FOR SELECT
  USING (true);

