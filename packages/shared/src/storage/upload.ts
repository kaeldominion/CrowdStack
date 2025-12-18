import "server-only";

import { createServiceRoleClient } from "../supabase/server";

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer | Blob | File,
  contentType?: string
): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromStorage(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete from storage: ${error.message}`);
  }
}

/**
 * Get a public URL for a file in storage
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  const supabase = createServiceRoleClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

