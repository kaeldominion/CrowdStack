-- Photo Gallery Enhancements Migration
-- Adds notification settings to photo_albums, creates photo_comments and photo_likes tables,
-- and adds stats counters to photos table.

-- ============================================================================
-- 1. Photo Album Settings for Notifications
-- ============================================================================

-- Add notification settings to photo_albums
ALTER TABLE public.photo_albums
ADD COLUMN IF NOT EXISTS photo_email_recipient_mode TEXT DEFAULT 'registered' 
  CHECK (photo_email_recipient_mode IN ('registered', 'attended')),
ADD COLUMN IF NOT EXISTS photo_auto_email_on_publish BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS photo_last_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_gallery_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_downloads BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.photo_albums.photo_email_recipient_mode IS 'Who receives photo notification emails: registered (all registrants) or attended (checked-in only)';
COMMENT ON COLUMN public.photo_albums.photo_auto_email_on_publish IS 'If true, automatically sends notification emails when album is published';
COMMENT ON COLUMN public.photo_albums.photo_last_notified_at IS 'Timestamp of last notification email batch (for debouncing)';
COMMENT ON COLUMN public.photo_albums.is_gallery_public IS 'If true, gallery is publicly accessible; if false, requires login + registration/attendance';
COMMENT ON COLUMN public.photo_albums.allow_downloads IS 'If true, allows photo downloads; if false, disables download button';

-- ============================================================================
-- 2. Photo Comments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT, -- Denormalized for display
  user_avatar_url TEXT, -- Denormalized for display
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Indexes for photo_comments
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON public.photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user_id ON public.photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_created_at ON public.photo_comments(created_at DESC);

-- Enable RLS on photo_comments
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read non-deleted comments
CREATE POLICY "Anyone can read photo comments"
  ON public.photo_comments FOR SELECT
  USING (deleted_at IS NULL);

-- RLS Policy: Authenticated users can insert comments
CREATE POLICY "Authenticated users can add comments"
  ON public.photo_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- RLS Policy: Users can soft-delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
  ON public.photo_comments FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR public.user_is_superadmin(auth.uid())
  );

COMMENT ON TABLE public.photo_comments IS 'Comments on event photos - flat list, soft delete supported';

-- ============================================================================
-- 3. Photo Likes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.photo_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(photo_id, user_id) -- One like per user per photo
);

-- Indexes for photo_likes
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo_id ON public.photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON public.photo_likes(user_id);

-- Enable RLS on photo_likes
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read likes (for counting)
CREATE POLICY "Anyone can read photo likes"
  ON public.photo_likes FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can add likes
CREATE POLICY "Authenticated users can add likes"
  ON public.photo_likes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- RLS Policy: Users can remove their own likes
CREATE POLICY "Users can remove own likes"
  ON public.photo_likes FOR DELETE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.photo_likes IS 'Photo likes - one like per user per photo, unique constraint enforced';

-- ============================================================================
-- 4. Photo Stats Counters
-- ============================================================================

-- Add stats counters to photos table (aggregate for performance)
ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.photos.view_count IS 'Number of times this photo has been viewed in lightbox';
COMMENT ON COLUMN public.photos.download_count IS 'Number of times this photo has been downloaded';
COMMENT ON COLUMN public.photos.like_count IS 'Cached count of likes (for performance)';
COMMENT ON COLUMN public.photos.comment_count IS 'Cached count of non-deleted comments (for performance)';

-- Create indexes for stats queries
CREATE INDEX IF NOT EXISTS idx_photos_view_count ON public.photos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_photos_like_count ON public.photos(like_count DESC);

-- ============================================================================
-- 5. Triggers to Maintain Like/Comment Counts
-- ============================================================================

-- Function to update like_count on photos
CREATE OR REPLACE FUNCTION update_photo_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.photos SET like_count = like_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.photos SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for like count
DROP TRIGGER IF EXISTS trigger_update_photo_like_count ON public.photo_likes;
CREATE TRIGGER trigger_update_photo_like_count
  AFTER INSERT OR DELETE ON public.photo_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_like_count();

-- Function to update comment_count on photos
CREATE OR REPLACE FUNCTION update_photo_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.photos SET comment_count = comment_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      UPDATE public.photos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.photo_id;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      UPDATE public.photos SET comment_count = comment_count + 1 WHERE id = NEW.photo_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment count
DROP TRIGGER IF EXISTS trigger_update_photo_comment_count ON public.photo_comments;
CREATE TRIGGER trigger_update_photo_comment_count
  AFTER INSERT OR UPDATE OF deleted_at ON public.photo_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_comment_count();

-- ============================================================================
-- 6. Notification Log Extension (optional - reuse message_logs)
-- ============================================================================

-- Add photo_notification tag support to message_logs if needed
-- The existing message_logs table can be used with appropriate status and subject patterns

