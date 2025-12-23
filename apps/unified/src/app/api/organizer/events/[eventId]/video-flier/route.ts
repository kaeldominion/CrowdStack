import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

// Extend timeout for large video uploads (Vercel Pro: up to 300s, Hobby: 60s)
export const maxDuration = 120; // 2 minutes
export const dynamic = 'force-dynamic';

/**
 * POST /api/organizer/events/[eventId]/video-flier
 * Upload event video flier (9:16 format, max 30 seconds recommended)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams.eventId;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    const userIsSuperadmin = await userHasRole("superadmin");

    const organizerId = await getUserOrganizerId();
    
    if (!userIsSuperadmin && !organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, flier_video_url")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check ownership only if not superadmin
    if (!userIsSuperadmin && event.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Access denied: Event does not belong to your organizer account" },
        { status: 403 }
      );
    }

    // #region agent log
    const requestStartTime = Date.now();
    console.log(`[VideoFlier] Request received at ${new Date().toISOString()}`);
    // #endregion
    
    // Check if this is a direct upload (JSON with URL) or traditional upload (FormData with file)
    const contentType = request.headers.get("content-type") || "";
    let publicUrl: string | null = null;
    
    if (contentType.includes("application/json")) {
      // Direct upload flow: client uploaded directly to Supabase, just update the event record
      const body = await request.json();
      publicUrl = body.flier_video_url;
      
      if (!publicUrl) {
        return NextResponse.json(
          { error: "Missing flier_video_url in request body" },
          { status: 400 }
        );
      }
      
      console.log(`[VideoFlier] Direct upload flow: updating event with URL: ${publicUrl}`);
    } else {
      // Traditional upload flow: file comes through server (for files < 4.5MB)
      const formData = await request.formData();
      const file = formData.get("file") as File;

      // #region agent log
      console.log(`[VideoFlier] Traditional upload flow: FormData parsed, file extracted: ${file ? 'YES' : 'NO'}`);
      if (file) {
        console.log(`[VideoFlier] File details: name=${file.name}, type=${file.type}, size=${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      // #endregion

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file type - video formats
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only MP4, WebM, and MOV videos are allowed." },
          { status: 400 }
        );
      }

      // Validate file size (50MB max - Supabase Storage default limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const fileSizeKB = (file.size / 1024).toFixed(2);
      
      // #region agent log
      console.log(`[VideoFlier] Size validation: file=${file.size} bytes (${fileSizeMB}MB / ${fileSizeKB}KB), max=${maxSize} bytes (50MB), comparison=${file.size > maxSize ? 'EXCEEDS' : 'OK'}`);
      // #endregion
      
      if (file.size > maxSize) {
        // #region agent log
        console.log(`[VideoFlier] ❌ REJECTED by server-side size check: ${fileSizeMB}MB > 50MB`);
        // #endregion
        return NextResponse.json(
          { error: `File size (${fileSizeMB}MB) exceeds 50MB limit. Please compress your video or use a smaller file.` },
          { status: 400 }
        );
      }
      
      // #region agent log
      console.log(`[VideoFlier] ✅ Size check PASSED: ${fileSizeMB}MB <= 50MB`);
      // #endregion

      // Generate unique filename
      const fileExt = file.name.split(".").pop() || "mp4";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `events/${eventId}/video-flier/${fileName}`;

      console.log(`[VideoFlier] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${storagePath}`);

      // Upload to storage
      try {
        const fileBuffer = await file.arrayBuffer();
        const bufferSizeMB = (fileBuffer.byteLength / 1024 / 1024).toFixed(2);
        console.log(`[VideoFlier] ArrayBuffer created: original=${file.size} bytes, buffer=${fileBuffer.byteLength} bytes (${bufferSizeMB}MB)`);
        
        // #region agent log
        if (fileBuffer.byteLength !== file.size) {
          console.log(`[VideoFlier] ⚠️ WARNING: Buffer size (${fileBuffer.byteLength}) differs from file size (${file.size})`);
        }
        console.log(`[VideoFlier] Attempting Supabase Storage upload: bucket=event-photos, path=${storagePath}, size=${bufferSizeMB}MB`);
        // #endregion
        
        publicUrl = await uploadToStorage(
          "event-photos", // Using existing bucket
          storagePath,
          Buffer.from(fileBuffer),
          file.type
        );
        console.log(`[VideoFlier] ✅ Upload successful: ${publicUrl}`);
      } catch (uploadError: any) {
        console.error(`[VideoFlier] Storage upload failed:`, uploadError);
        const errorMessage = uploadError?.message || String(uploadError);
        const errorString = JSON.stringify(uploadError, null, 2);
        console.error(`[VideoFlier] Error details - message: ${errorMessage}, full error: ${errorString}, file size: ${fileSizeMB}MB`);
        
        // Check for Supabase Storage size limit error
        if (errorMessage.includes("exceeded the maximum allowed size") || 
            errorMessage.includes("maximum allowed size") ||
            errorMessage.includes("file too large") ||
            errorMessage.includes("File size limit exceeded")) {
          console.error(`[VideoFlier] Supabase Storage size limit error detected for ${fileSizeMB}MB file`);
          return NextResponse.json(
            { error: `File size (${fileSizeMB}MB) exceeds storage limit. Please compress your video or use a smaller file.` },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: `Storage upload failed: ${uploadError.message}` },
          { status: 500 }
        );
      }
    }
    
    if (!publicUrl) {
      return NextResponse.json(
        { error: "Failed to get video URL" },
        { status: 500 }
      );
    }

    // Delete old video if exists
    if (event.flier_video_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = event.flier_video_url.split("/event-photos/");
        if (urlParts.length > 1) {
          await deleteFromStorage("event-photos", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete old video flier:", storageError);
      }
    }

    // Update event with video URL
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ flier_video_url: publicUrl })
      .eq("id", eventId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update event video flier" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flier_video_url: publicUrl });
  } catch (error: any) {
    console.error("Failed to upload video flier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload video flier" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizer/events/[eventId]/video-flier
 * Remove event video flier
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams.eventId;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    const userIsSuperadmin = await userHasRole("superadmin");

    const organizerId = await getUserOrganizerId();
    
    if (!userIsSuperadmin && !organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists and get video URL
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, flier_video_url")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check ownership only if not superadmin
    if (!userIsSuperadmin && event.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Access denied: Event does not belong to your organizer account" },
        { status: 403 }
      );
    }

    // Delete video from storage if exists
    if (event.flier_video_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = event.flier_video_url.split("/event-photos/");
        if (urlParts.length > 1) {
          await deleteFromStorage("event-photos", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete video from storage:", storageError);
      }
    }

    // Update event to remove video URL
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ flier_video_url: null })
      .eq("id", eventId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to remove video flier from event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, flier_video_url: null });
  } catch (error: any) {
    console.error("Failed to delete video flier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete video flier" },
      { status: 500 }
    );
  }
}

