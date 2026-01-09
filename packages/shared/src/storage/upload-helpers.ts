/**
 * File Upload Helpers
 *
 * Centralized utilities for handling file uploads with validation,
 * to reduce code duplication across API routes.
 */

import { createServiceRoleClient } from "../supabase/server";

export interface FileUploadConfig {
  /** Maximum file size in bytes */
  maxSize: number;
  /** Allowed MIME types (e.g., ["image/jpeg", "image/png"]) */
  allowedTypes: string[];
  /** Storage bucket name */
  bucket: string;
}

export interface FileUploadResult {
  success: true;
  publicUrl: string;
  path: string;
}

export interface FileUploadError {
  success: false;
  error: string;
  code: "INVALID_TYPE" | "TOO_LARGE" | "UPLOAD_FAILED" | "VALIDATION_ERROR";
}

/**
 * Default configurations for common upload scenarios
 */
export const UPLOAD_CONFIGS = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    bucket: "avatars",
  },
  cover: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    bucket: "covers",
  },
  flier: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    bucket: "fliers",
  },
  eventPhoto: {
    maxSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    bucket: "event-photos",
  },
  gallery: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    bucket: "gallery",
  },
} as const;

/**
 * Validate a file against the upload configuration.
 *
 * @param file - The file to validate
 * @param config - Upload configuration
 * @returns Error object if validation fails, null if valid
 */
export function validateFile(
  file: File,
  config: FileUploadConfig
): FileUploadError | null {
  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `File type not allowed. Allowed types: ${config.allowedTypes.join(", ")}`,
      code: "INVALID_TYPE",
    };
  }

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    return {
      success: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
      code: "TOO_LARGE",
    };
  }

  return null;
}

/**
 * Generate a unique file path for storage.
 *
 * @param entityId - ID of the entity (e.g., user ID, event ID)
 * @param type - Type of file (e.g., "avatar", "cover")
 * @param originalFilename - Original filename to extract extension
 * @returns Generated file path
 */
export function generateFilePath(
  entityId: string,
  type: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename.split(".").pop() || "jpg";

  return `${entityId}/${type}/${timestamp}-${random}.${extension}`;
}

/**
 * Upload a file to Supabase Storage with validation.
 *
 * @param file - The file to upload
 * @param entityId - ID of the entity owning the file
 * @param type - Type of file (for path generation)
 * @param config - Upload configuration
 * @returns Upload result or error
 */
export async function uploadFile(
  file: File,
  entityId: string,
  type: string,
  config: FileUploadConfig
): Promise<FileUploadResult | FileUploadError> {
  // Validate file
  const validationError = validateFile(file, config);
  if (validationError) {
    return validationError;
  }

  // Generate path
  const path = generateFilePath(entityId, type, file.name);

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to storage
  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from(config.bucket)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error(`[uploadFile] Upload failed:`, error);
    return {
      success: false,
      error: "Failed to upload file",
      code: "UPLOAD_FAILED",
    };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(config.bucket).getPublicUrl(path);

  return {
    success: true,
    publicUrl,
    path,
  };
}

/**
 * Delete a file from storage by its URL.
 *
 * @param publicUrl - The public URL of the file
 * @param bucket - Storage bucket name
 * @returns true if deleted successfully
 */
export async function deleteFileByUrl(
  publicUrl: string,
  bucket: string
): Promise<boolean> {
  try {
    // Extract path from URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const urlParts = publicUrl.split(`/storage/v1/object/public/${bucket}/`);
    if (urlParts.length !== 2) {
      console.warn(`[deleteFileByUrl] Could not parse URL: ${publicUrl}`);
      return false;
    }

    const path = decodeURIComponent(urlParts[1]);

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error(`[deleteFileByUrl] Delete failed:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[deleteFileByUrl] Error:`, error);
    return false;
  }
}

/**
 * Replace an existing file with a new one.
 * Uploads the new file, then deletes the old one (if it exists).
 *
 * @param newFile - The new file to upload
 * @param oldUrl - URL of the existing file to replace (optional)
 * @param entityId - ID of the entity owning the file
 * @param type - Type of file (for path generation)
 * @param config - Upload configuration
 * @returns Upload result or error
 */
export async function replaceFile(
  newFile: File,
  oldUrl: string | null | undefined,
  entityId: string,
  type: string,
  config: FileUploadConfig
): Promise<FileUploadResult | FileUploadError> {
  // Upload new file first
  const result = await uploadFile(newFile, entityId, type, config);

  if (!result.success) {
    return result;
  }

  // Delete old file if it exists (non-blocking, errors are logged but ignored)
  if (oldUrl) {
    deleteFileByUrl(oldUrl, config.bucket).catch((err) => {
      console.warn(`[replaceFile] Failed to delete old file:`, err);
    });
  }

  return result;
}
