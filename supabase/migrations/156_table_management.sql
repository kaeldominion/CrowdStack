-- Table Management for Nightlife Venues
-- Allows venues to define zones, tables, and manage per-event availability

-- ============================================================================
-- 1. TABLE ZONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.table_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_table_zones_venue_id ON public.table_zones(venue_id);
CREATE INDEX IF NOT EXISTS idx_table_zones_created_by ON public.table_zones(created_by);

-- RLS for table_zones
ALTER TABLE public.table_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all zones"
  ON public.table_zones FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

CREATE POLICY "Venue admins can manage their venue zones"
  ON public.table_zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = table_zones.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = table_zones.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_table_zones_updated_at
  BEFORE UPDATE ON public.table_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. VENUE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venue_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.table_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  notes TEXT,
  minimum_spend DECIMAL(10, 2),
  deposit_amount DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(venue_id, name)
);

CREATE INDEX IF NOT EXISTS idx_venue_tables_venue_id ON public.venue_tables(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_tables_zone_id ON public.venue_tables(zone_id);
CREATE INDEX IF NOT EXISTS idx_venue_tables_is_active ON public.venue_tables(is_active);
CREATE INDEX IF NOT EXISTS idx_venue_tables_created_by ON public.venue_tables(created_by);

-- RLS for venue_tables
ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all tables"
  ON public.venue_tables FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

CREATE POLICY "Venue admins can manage their venue tables"
  ON public.venue_tables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_tables.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE v.id = venue_tables.venue_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_venue_tables_updated_at
  BEFORE UPDATE ON public.venue_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. EVENT TABLE AVAILABILITY (Per-Event Overrides)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_table_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.venue_tables(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT TRUE,
  -- Per-event overrides (NULL = use table defaults)
  override_minimum_spend DECIMAL(10, 2),
  override_deposit DECIMAL(10, 2),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, table_id)
);

CREATE INDEX IF NOT EXISTS idx_event_table_availability_event_id ON public.event_table_availability(event_id);
CREATE INDEX IF NOT EXISTS idx_event_table_availability_table_id ON public.event_table_availability(table_id);
CREATE INDEX IF NOT EXISTS idx_event_table_availability_is_available ON public.event_table_availability(is_available);

-- RLS for event_table_availability
ALTER TABLE public.event_table_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage all event table availability"
  ON public.event_table_availability FOR ALL
  USING (public.user_has_role(auth.uid(), 'superadmin'::user_role))
  WITH CHECK (public.user_has_role(auth.uid(), 'superadmin'::user_role));

CREATE POLICY "Venue admins can manage table availability for their venue events"
  ON public.event_table_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = event_table_availability.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON e.venue_id = v.id
      LEFT JOIN public.venue_users vu ON v.id = vu.venue_id
      WHERE e.id = event_table_availability.event_id
      AND (v.created_by = auth.uid() OR vu.user_id = auth.uid())
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_event_table_availability_updated_at
  BEFORE UPDATE ON public.event_table_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
