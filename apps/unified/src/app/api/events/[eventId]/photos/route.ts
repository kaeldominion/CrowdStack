import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { canUploadPhotosToEvent } from "@crowdstack/shared/auth/photo-permissions";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/**
 * GET /api/events/[eventId]/photos
 * List all photos for an event (public access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();

    // Get or create album for this event
    let { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("*")
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      // Create album if it doesn't exist
      const { data: event } = await serviceSupabase
        .from("events")
        .select("name")
        .eq("id", params.eventId)
        .single();

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      const { data: newAlbum } = await serviceSupabase
        .from("photo_albums")
        .insert({
          event_id: params.eventId,
          title: `${event.name} Photos`,
          status: "draft",
        })
        .select()
        .single();

      album = newAlbum;
    }

    // Get all photos for this album
    const { data: photos, error } = await serviceSupabase
      .from("photos")
      .select("*")
      .eq("album_id", album.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching photos from database:", error);
      // If it's a permission error, return 403, otherwise 500
      if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get public URLs for photos
    const photosWithUrls = (photos || []).map((photo) => {
      const publicUrl = serviceSupabase.storage
        .from("event-photos")
        .getPublicUrl(photo.storage_path);

      const thumbnailUrl = photo.thumbnail_path
        ? serviceSupabase.storage
            .from("event-photos")
            .getPublicUrl(photo.thumbnail_path)
        : publicUrl;

      return {
        ...photo,
        url: publicUrl.data.publicUrl,
        thumbnail_url: thumbnailUrl.data.publicUrl,
      };
    });

    return NextResponse.json({
      album,
      photos: photosWithUrls,
    });
  } catch (error: any) {
    console.error("Error fetching photos:", error);
    // Check if it's a permission/RLS error
    if (error.code === "42501" || error.message?.includes("permission") || error.message?.includes("policy")) {
      return NextResponse.json(
        { error: "Permission denied. Please ensure you have access to this event." },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/photos
 * Upload one or more photos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check upload permissions
    if (!(await canUploadPhotosToEvent(params.eventId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, name")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get or create album
    let { data: album } = await serviceSupabase
      .from("photo_albums")
      .select("id")
      .eq("event_id", params.eventId)
      .single();

    if (!album) {
      const { data: newAlbum, error: albumError } = await serviceSupabase
        .from("photo_albums")
        .insert({
          event_id: params.eventId,
          title: `${event.name} Photos`,
          status: "draft",
        })
        .select()
        .single();

      if (albumError || !newAlbum) {
        return NextResponse.json(
          { error: "Failed to create photo album" },
          { status: 500 }
        );
      }

      album = newAlbum;
    }

    // Ensure album is not null (TypeScript guard)
    if (!album) {
      return NextResponse.json(
        { error: "Photo album not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedPhotos = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only JPEG, PNG, and WebP are allowed.`);
        continue; // Skip invalid files
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size is 10MB.`);
        continue; // Skip oversized files
      }

      // Generate unique filename
      const photoId = crypto.randomUUID();
      const fileExt = file.name.split(".").pop() || "jpg";
      const storagePath = `${params.eventId}/${photoId}.${fileExt}`;

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to storage
      let publicUrl: string;
      try {
        publicUrl = await uploadToStorage(
          "event-photos",
          storagePath,
          buffer,
          file.type
        );
      } catch (storageError: any) {
        console.error("Storage upload error:", storageError);
        const errorMsg = storageError.message || String(storageError);
        // Check if it's a bucket not found error
        if (errorMsg.includes("Bucket not found") || 
            errorMsg.includes("not found") ||
            errorMsg.includes("does not exist") ||
            errorMsg.includes("No such bucket")) {
          errors.push(
            `${file.name}: Storage bucket 'event-photos' not found. Please create it in Supabase Dashboard → Storage.`
          );
        } else {
          errors.push(`${file.name}: ${errorMsg}`);
        }
        continue; // Skip this file and continue with others
      }

      // Get image dimensions (basic - we'll enhance with sharp later)
      // For now, we'll set placeholder values
      const width = 1920; // Placeholder
      const height = 1080; // Placeholder

      // Create thumbnail path (Supabase can generate this on-the-fly)
      const thumbnailPath = storagePath; // Same path, we'll use query params for resizing

      // Insert photo record
      const { data: photo, error: photoError } = await serviceSupabase
        .from("photos")
        .insert({
          album_id: album.id,
          storage_path: storagePath,
          thumbnail_path: thumbnailPath,
          width,
          height,
          file_size: file.size,
          uploaded_by: user.id,
          display_order: 0, // Will be updated if reordering is implemented
        })
        .select()
        .single();

      if (photoError) {
        console.error("Error inserting photo:", photoError);
        // Try to clean up the uploaded file if DB insert fails
        try {
          await serviceSupabase.storage.from("event-photos").remove([storagePath]);
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded file:", cleanupError);
        }
        errors.push(`${file.name}: Database error - ${photoError.message}`);
        continue;
      }

      // Get public URLs
      const photoUrl = serviceSupabase.storage
        .from("event-photos")
        .getPublicUrl(storagePath);

      uploadedPhotos.push({
        ...photo,
        url: photoUrl.data.publicUrl,
        thumbnail_url: photoUrl.data.publicUrl + "?width=400&quality=80",
      });
    }

    return NextResponse.json({
      success: uploadedPhotos.length > 0,
      photos: uploadedPhotos,
      uploaded: uploadedPhotos.length,
      skipped: files.length - uploadedPhotos.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload photos" },
      { status: 500 }
    );
  }
}

