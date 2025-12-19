# Supabase Storage Bucket Setup

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

