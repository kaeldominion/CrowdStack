-- Restructure User Management
-- This migration restructures how users relate to venues, organizers, and promoters
-- Following the principle: Everyone is a user, roles and profiles are separate

-- ============================================
-- 1. VENUE & ORGANIZER USER ASSIGNMENTS
-- ============================================
-- Allow multiple users to manage a venue or organizer (many-to-many)

CREATE TABLE IF NOT EXISTS public.venue_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'staff')), -- Future: could have different permission levels
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organizer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organizer_id, user_id)
);

-- Migrate existing created_by relationships to the new junction tables
INSERT INTO public.venue_users (venue_id, user_id, role, assigned_at)
SELECT id, created_by, 'admin', created_at
FROM public.venues
WHERE created_by IS NOT NULL
ON CONFLICT (venue_id, user_id) DO NOTHING;

INSERT INTO public.organizer_users (organizer_id, user_id, role, assigned_at)
SELECT id, created_by, 'admin', created_at
FROM public.organizers
WHERE created_by IS NOT NULL
ON CONFLICT (organizer_id, user_id) DO NOTHING;

-- Keep created_by for audit/history, but we'll primarily use junction tables going forward
-- We'll update RLS policies to check both created_by and junction tables

-- ============================================
-- 2. PROMOTERS - Make it a role + profile link
-- ============================================
-- Promoters table becomes a profile (any user can become a promoter)
-- The promoter profile is linked to user via user_id (one-to-one)
-- But user still needs the 'promoter' role in user_roles

-- Migrate existing promoter created_by to user_id if not already set
-- First, add user_id column if it doesn't exist (check first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promoters' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.promoters ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Handle duplicates: Keep only the oldest promoter profile per user
    -- Step 1: Set user_id for the first promoter per created_by (oldest one)
    WITH ranked_promoters AS (
      SELECT id, created_by, 
             ROW_NUMBER() OVER (PARTITION BY created_by ORDER BY created_at ASC, id ASC) as rn
      FROM public.promoters
      WHERE created_by IS NOT NULL
    )
    UPDATE public.promoters p
    SET user_id = rp.created_by
    FROM ranked_promoters rp
    WHERE p.id = rp.id AND rp.rn = 1;
    
    -- Step 2: For remaining promoters (duplicates), leave user_id as NULL
    -- They can be manually fixed later or deleted by admin
    
    -- Step 3: Migrate non-duplicate promoters (those where created_by appears only once)
    UPDATE public.promoters 
    SET user_id = created_by 
    WHERE user_id IS NULL 
      AND created_by IS NOT NULL
      AND created_by IN (
        SELECT created_by
        FROM public.promoters
        WHERE created_by IS NOT NULL
        GROUP BY created_by
        HAVING COUNT(*) = 1
      );
    
    -- Create unique index (will only apply to non-null user_id values)
    -- This allows promoters without user_id (duplicates) to coexist
    CREATE UNIQUE INDEX IF NOT EXISTS idx_promoters_user_id ON public.promoters(user_id) WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- Add status for promoter requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promoters' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.promoters ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended'));
  END IF;
END $$;

-- Add request metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promoters' 
    AND column_name = 'requested_at'
  ) THEN
    ALTER TABLE public.promoters ADD COLUMN requested_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE public.promoters ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    ALTER TABLE public.promoters ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 3. ATTENDEE EMAIL IMPORTS
-- ============================================
-- Support importing lists of attendees by email/phone
-- These can be pre-created before users sign up

-- Add import tracking to attendees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendees' 
    AND column_name = 'import_source'
  ) THEN
    ALTER TABLE public.attendees ADD COLUMN import_source TEXT; -- e.g., 'csv_upload', 'manual', 'api'
    ALTER TABLE public.attendees ADD COLUMN imported_by UUID REFERENCES auth.users(id);
    ALTER TABLE public.attendees ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_venue_users_venue_id ON public.venue_users(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_users_user_id ON public.venue_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organizer_users_organizer_id ON public.organizer_users(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_users_user_id ON public.organizer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_promoters_user_id ON public.promoters(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promoters_status ON public.promoters(status);
CREATE INDEX IF NOT EXISTS idx_attendees_import_source ON public.attendees(import_source);

-- ============================================
-- 5. UPDATE HELPER FUNCTIONS
-- ============================================
-- Update functions to check junction tables in addition to created_by

CREATE OR REPLACE FUNCTION public.get_user_venue_ids(user_uuid UUID)
RETURNS TABLE(venue_id UUID) AS $$
  SELECT DISTINCT v.id
  FROM public.venues v
  WHERE v.created_by = user_uuid
  UNION
  SELECT vu.venue_id
  FROM public.venue_users vu
  WHERE vu.user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_organizer_ids(user_uuid UUID)
RETURNS TABLE(organizer_id UUID) AS $$
  SELECT DISTINCT o.id
  FROM public.organizers o
  WHERE o.created_by = user_uuid
  UNION
  SELECT ou.organizer_id
  FROM public.organizer_users ou
  WHERE ou.user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_promoter_id(user_uuid UUID)
RETURNS UUID AS $$
  SELECT p.id
  FROM public.promoters p
  WHERE p.user_id = user_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE public.venue_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_users
CREATE POLICY "Users can read their venue assignments"
  ON public.venue_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Venue admins can read all assignments for their venues"
  ON public.venue_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venue_users vu
      WHERE vu.venue_id = venue_users.venue_id
      AND vu.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_users.venue_id
      AND v.created_by = auth.uid()
    )
  );

-- RLS Policies for organizer_users
CREATE POLICY "Users can read their organizer assignments"
  ON public.organizer_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can read all assignments for their organizers"
  ON public.organizer_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizer_users ou
      WHERE ou.organizer_id = organizer_users.organizer_id
      AND ou.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_users.organizer_id
      AND o.created_by = auth.uid()
    )
  );

-- Superadmins can do everything (handled via service role in practice)

COMMENT ON TABLE public.venue_users IS 'Many-to-many relationship between users and venues. Admin can assign users to manage venues.';
COMMENT ON TABLE public.organizer_users IS 'Many-to-many relationship between users and organizers. Admin can assign users to manage organizers.';
COMMENT ON COLUMN public.promoters.user_id IS 'Link to auth.users. User must also have promoter role in user_roles.';
COMMENT ON COLUMN public.promoters.status IS 'Status: pending (requested), active (approved), suspended (banned).';

