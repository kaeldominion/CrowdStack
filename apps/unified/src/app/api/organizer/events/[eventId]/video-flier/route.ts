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

    const formData = await request.formData();
    const file = formData.get("file") as File;

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

    // Validate file size (100MB max for videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "mp4";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `events/${eventId}/video-flier/${fileName}`;

    console.log(`[VideoFlier] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) to ${storagePath}`);

    // Upload to storage
    let publicUrl: string;
    try {
      const fileBuffer = await file.arrayBuffer();
      console.log(`[VideoFlier] ArrayBuffer created, size: ${fileBuffer.byteLength} bytes`);
      
      publicUrl = await uploadToStorage(
        "event-photos", // Using existing bucket
        storagePath,
        Buffer.from(fileBuffer),
        file.type
      );
      console.log(`[VideoFlier] Upload successful: ${publicUrl}`);
    } catch (uploadError: any) {
      console.error(`[VideoFlier] Storage upload failed:`, uploadError);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
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

