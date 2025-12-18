-- Seed data for CrowdStack MVP development
-- This migration creates sample data for testing and development

-- Note: This seed data assumes you have at least one auth user created
-- Replace the placeholder UUIDs with actual user IDs from your auth.users table
-- Or use a helper function to get the first user

-- Helper function to get first user (for seeding)
CREATE OR REPLACE FUNCTION public.get_first_user()
RETURNS UUID AS $$
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Sample Venue
INSERT INTO public.venues (id, name, address, city, state, country, phone, email, website, created_by)
VALUES (
  gen_random_uuid(),
  'The Grand Ballroom',
  '123 Main Street',
  'San Francisco',
  'CA',
  'US',
  '+1-555-0100',
  'venue@example.com',
  'https://example.com/venue',
  public.get_first_user()
)
ON CONFLICT DO NOTHING;

-- Sample Organizer
INSERT INTO public.organizers (id, name, email, phone, company_name, created_by)
VALUES (
  gen_random_uuid(),
  'Event Masters Inc.',
  'organizer@example.com',
  '+1-555-0200',
  'Event Masters Inc.',
  public.get_first_user()
)
ON CONFLICT DO NOTHING;

-- Sample Promoters
INSERT INTO public.promoters (id, name, email, phone, created_by)
VALUES 
  (
    gen_random_uuid(),
    'Promoter One',
    'promoter1@example.com',
    '+1-555-0301',
    public.get_first_user()
  ),
  (
    gen_random_uuid(),
    'Promoter Two',
    'promoter2@example.com',
    '+1-555-0302',
    public.get_first_user()
  )
ON CONFLICT DO NOTHING;

-- Sample test invite tokens
-- These can be used to test the invite flow
-- Token format: simple UUID for now (in production, use cryptographically secure tokens)
INSERT INTO public.invite_tokens (id, token, role, metadata, created_by)
SELECT 
  gen_random_uuid(),
  'test-venue-admin-token-' || gen_random_uuid()::text,
  'venue_admin'::user_role,
  '{"venue_id": null}'::jsonb,
  public.get_first_user()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.invite_tokens (id, token, role, metadata, created_by)
SELECT 
  gen_random_uuid(),
  'test-organizer-token-' || gen_random_uuid()::text,
  'event_organizer'::user_role,
  '{"organizer_id": null}'::jsonb,
  public.get_first_user()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.invite_tokens (id, token, role, metadata, created_by)
SELECT 
  gen_random_uuid(),
  'test-promoter-token-' || gen_random_uuid()::text,
  'promoter'::user_role,
  '{"promoter_id": null}'::jsonb,
  public.get_first_user()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.invite_tokens (id, token, role, metadata, created_by)
SELECT 
  gen_random_uuid(),
  'test-door-staff-token-' || gen_random_uuid()::text,
  'door_staff'::user_role,
  '{}'::jsonb,
  public.get_first_user()
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

-- Helper function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(
  user_uuid UUID,
  role_name user_role,
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  role_id UUID;
BEGIN
  INSERT INTO public.user_roles (user_id, role, metadata)
  VALUES (user_uuid, role_name, metadata)
  ON CONFLICT (user_id, role) DO UPDATE SET metadata = EXCLUDED.metadata
  RETURNING id INTO role_id;
  RETURN role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create invite token
CREATE OR REPLACE FUNCTION public.create_invite_token(
  role_name user_role,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_uuid UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  token_text TEXT;
  creator_uuid UUID;
BEGIN
  -- Use provided creator or first user
  creator_uuid := COALESCE(created_by_uuid, public.get_first_user());
  
  -- Generate secure token
  token_text := 'invite-' || role_name::text || '-' || gen_random_uuid()::text;
  
  INSERT INTO public.invite_tokens (token, role, metadata, created_by)
  VALUES (token_text, role_name, metadata, creator_uuid)
  ON CONFLICT (token) DO NOTHING;
  
  RETURN token_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

