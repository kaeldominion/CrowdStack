# Supabase Storage Bucket Setup

## Organizer Images Bucket

**Bucket Name:** `organizer-images`

**Access Level:** Public read, authenticated upload

**Purpose:** Store organizer logos/avatars and team member avatars

### Creation

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizer-images', 'organizer-images', true);
```

### Storage Policies

**Public Read Policy:**
```sql
CREATE POLICY "Public can read organizer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'organizer-images');
```

**Authenticated Upload Policy (Organizers only):**
```sql
CREATE POLICY "Organizers can upload their images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organizer-images'
  AND (
    -- Check if user is an organizer
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.created_by = auth.uid()
    )
  )
);
```

**Organizer Update/Delete Policy:**
```sql
CREATE POLICY "Organizers can update their images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organizer-images'
  AND EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.created_by = auth.uid()
  )
);

CREATE POLICY "Organizers can delete their images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organizer-images'
  AND EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.created_by = auth.uid()
  )
);
```

### Folder Structure

```
organizer-images/
  {organizer_id}/
    logo/
      {filename}
    team/
      {team_member_id}/
        {filename}
```

### Usage

- **Logo upload:** `organizer-images/{organizer_id}/logo/{timestamp}-{filename}`
- **Team member avatar:** `organizer-images/{organizer_id}/team/{team_member_id}/{timestamp}-{filename}`

---

## Create the `avatars` Bucket

### Via Supabase Dashboard:

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Set:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Enabled** (toggle ON - this allows public read access)
4. Click **"Create bucket"**

### Via SQL (Alternative):

```sql
-- Create the avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

## Storage Policies

Since we're using the **service role client** in the API routes, RLS policies are bypassed. However, it's still good practice to set them up for future use or if you switch to user-scoped operations.

### Policy 1: Authenticated users can upload

- **Policy name**: `Authenticated users can upload avatars`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(auth.uid() IS NOT NULL)
```

This is correct! ✅ It allows any authenticated user to upload files.

### Policy 2: Public can read avatars

- **Policy name**: `Public can read avatars`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
(true)
```

This allows anyone (even unauthenticated) to read/view avatar images.

### Policy 3: Users can delete their own avatars (Optional)

Since we're using service role client for deletion, this policy won't be checked. But if you want it for future use:

- **Policy name**: `Users can delete their own avatars`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(auth.uid()::text = (string_to_array(name, '-'))[1])
```

This checks if the user ID matches the first part of the filename (before the `-`).

## Notes

- The bucket **must be public** for avatar images to be accessible via URL
- The API routes use service role client, so they bypass these policies
- Files are stored as: `avatars/${userId}-${timestamp}.${ext}`

---

## Create the `venue-images` Bucket

### Via Supabase Dashboard:

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Set:
   - **Name**: `venue-images`
   - **Public bucket**: ✅ **Enabled** (toggle ON - this allows public read access)
4. Click **"Create bucket"**

### Via SQL (Alternative):

```sql
-- Create the venue-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;
```

## Storage Policies

Since we're using the **service role client** in the API routes, RLS policies are bypassed. However, it's still good practice to set them up for future use or if you switch to user-scoped operations.

### Policy 1: Authenticated users can upload venue images

- **Policy name**: `Authenticated users can upload venue images`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(auth.uid() IS NOT NULL)
```

Note: The API routes enforce additional permissions (venue admin) server-side.

### Policy 2: Public can read venue images

- **Policy name**: `Public can read venue images`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
(true)
```

This allows anyone (even unauthenticated) to read/view venue images.

### Policy 3: Venue admins can delete their venue images (Optional)

- **Policy name**: `Venue admins can delete their venue images`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id::text = (string_to_array(name, '/'))[2]
    AND venues.created_by = auth.uid()
  )
)
```

This checks if the user is the venue admin for the venue whose images are being deleted.

## Folder Structure

Venue images are stored with the following structure:
```
venue-images/
  {venue_id}/
    logo/
      {filename}
    cover/
      {filename}
    gallery/
      {image_id}.{ext}
```

Example:
```
venue-images/
  123e4567-e89b-12d3-a456-426614174000/
    logo/
      logo.png
    cover/
      cover.jpg
    gallery/
      abc123.jpg
      def456.png
```

## Image Transformations

Supabase Storage supports on-the-fly image transformations via query parameters:

- **Thumbnail**: `?width=400&quality=80`
- **Full size**: `?width=1920&quality=90`
- **Original**: No query parameters

The API routes automatically generate thumbnail URLs using these transformations.

## Notes

- The bucket **must be public** for venue images to be accessible via URL
- The API routes use service role client, so they bypass storage policies
- Images are organized by venue ID and type (logo, cover, gallery) for easy management
- Maximum file size: 10MB per image
- Supported formats: JPEG, PNG, WebP

