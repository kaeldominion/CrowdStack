# Event Photos Storage Bucket Setup

## Create the `event-photos` Bucket

### Via Supabase Dashboard:

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Set:
   - **Name**: `event-photos`
   - **Public bucket**: ✅ **Enabled** (toggle ON - this allows public read access)
4. Click **"Create bucket"**

### Via SQL (Alternative):

```sql
-- Create the event-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;
```

## Storage Policies

Since we're using the **service role client** in the API routes, RLS policies are bypassed. However, it's still good practice to set them up for future use or if you switch to user-scoped operations.

### Policy 1: Authenticated users can upload (with permissions)

- **Policy name**: `Authenticated users can upload event photos`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(auth.uid() IS NOT NULL)
```

Note: The API routes enforce additional permissions (organizer, promoter, venue staff) server-side.

### Policy 2: Public can read event photos

- **Policy name**: `Public can read event photos`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
(true)
```

This allows anyone (even unauthenticated) to read/view event photos once the album is published.

### Policy 3: Users can delete their own photos (Optional)

- **Policy name**: `Users can delete their own photos`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(auth.uid()::text = (string_to_array(name, '/'))[2])
```

This checks if the user ID matches the uploader (stored in the photos table).

## Folder Structure

Photos are stored with the following structure:
```
event-photos/
  {event_id}/
    {photo_id}.{ext}
```

Example:
```
event-photos/
  123e4567-e89b-12d3-a456-426614174000/
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

- The bucket **must be public** for photos to be accessible via URL
- The API routes use service role client, so they bypass storage policies
- Photos are organized by event ID for easy management
- Maximum file size: 10MB per photo
- Supported formats: JPEG, PNG, WebP

