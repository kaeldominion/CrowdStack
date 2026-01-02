-- Auto-create promoter profile for DJs
-- When a DJ profile is created, automatically create a promoter profile
-- This allows DJs to use the existing promoter payment and QR code system

-- Create function to auto-create promoter when DJ is created
CREATE OR REPLACE FUNCTION public.auto_create_promoter_for_dj()
RETURNS TRIGGER AS $$
DECLARE
  v_promoter_id UUID;
BEGIN
  -- Only create promoter if user_id is not null (DJ has a user account)
  IF NEW.user_id IS NOT NULL THEN
    -- Check if promoter already exists for this user
    SELECT id INTO v_promoter_id
    FROM public.promoters
    WHERE created_by = NEW.user_id
    LIMIT 1;
    
    -- If no promoter exists, create one
    IF v_promoter_id IS NULL THEN
      INSERT INTO public.promoters (name, email, phone, created_by)
      VALUES (
        COALESCE(NEW.name, NEW.handle),
        NULL, -- Email can be added later if needed
        NULL, -- Phone can be added later if needed
        NEW.user_id
      )
      RETURNING id INTO v_promoter_id;
      
      -- Ensure user has promoter role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'promoter'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create promoter when DJ profile is created
DROP TRIGGER IF EXISTS trigger_auto_create_promoter_for_dj ON public.djs;
CREATE TRIGGER trigger_auto_create_promoter_for_dj
  AFTER INSERT ON public.djs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_promoter_for_dj();

-- Also handle existing DJs - create promoters for any DJs that don't have one
DO $$
DECLARE
  dj_record RECORD;
  v_promoter_id UUID;
BEGIN
  FOR dj_record IN 
    SELECT id, user_id, name, handle
    FROM public.djs
    WHERE user_id IS NOT NULL
  LOOP
    -- Check if promoter exists
    SELECT id INTO v_promoter_id
    FROM public.promoters
    WHERE created_by = dj_record.user_id
    LIMIT 1;
    
    -- If no promoter exists, create one
    IF v_promoter_id IS NULL THEN
      INSERT INTO public.promoters (name, email, phone, created_by)
      VALUES (
        COALESCE(dj_record.name, dj_record.handle),
        NULL,
        NULL,
        dj_record.user_id
      );
      
      -- Ensure user has promoter role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (dj_record.user_id, 'promoter'::user_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.auto_create_promoter_for_dj IS 'Automatically creates a promoter profile when a DJ profile is created, allowing DJs to use the promoter payment and QR code system';

