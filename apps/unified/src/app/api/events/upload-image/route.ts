import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { uploadToStorage, deleteFromStorage } from "@crowdstack/shared/storage/upload";

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/upload-image
 * Upload flier or cover image for an event
 * FormData:
 *   - file: The image file
 *   - eventId: The event ID
 *   - type: "flier" or "cover" (default: "flier")
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const eventId = formData.get("eventId") as string;
    const imageType = (formData.get("type") as string) || "flier";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    if (!["flier", "cover"].includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'flier' or 'cover'" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max for fliers)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Check if event exists and user has access
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("id, venue_id, organizer_id, owner_user_id, flier_url, cover_image_url, slug")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check user has permission (owner, venue admin, organizer, or superadmin)
    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    const isOwner = event.owner_user_id === userId;

    // Check venue access
    let hasVenueAccess = false;
    if (event.venue_id) {
      const { data: venueUser } = await serviceClient
        .from("venue_users")
        .select("id")
        .eq("venue_id", event.venue_id)
        .eq("user_id", userId)
        .single();
      hasVenueAccess = !!venueUser;
    }

    // Check organizer access
    let hasOrganizerAccess = false;
    if (event.organizer_id) {
      const { data: orgUser } = await serviceClient
        .from("organizer_users")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("user_id", userId)
        .single();
      hasOrganizerAccess = !!orgUser;
    }

    if (!isSuperadmin && !isOwner && !hasVenueAccess && !hasOrganizerAccess) {
      return NextResponse.json(
        { error: "You don't have permission to upload images for this event" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "webp";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `events/${eventId}/${imageType}/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "event-images",
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Delete old image if exists
    const oldUrl = imageType === "flier" ? event.flier_url : event.cover_image_url;
    if (oldUrl && oldUrl.includes("event-images")) {
      try {
        // Extract storage path from URL
        const urlMatch = oldUrl.match(/event-images\/(.+)$/);
        if (urlMatch) {
          await deleteFromStorage("event-images", urlMatch[1]);
        }
      } catch (e) {
        console.error("Failed to delete old event image:", e);
      }
    }

    // Update event with new image URL
    const updateField = imageType === "flier" ? "flier_url" : "cover_image_url";
    const { error: updateError } = await serviceClient
      .from("events")
      .update({
        [updateField]: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("Failed to update event:", updateError);
      // Don't fail - the image was uploaded successfully
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      type: imageType,
    });
  } catch (error: any) {
    console.error("Failed to upload event image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image" },
      { status: 500 }
    );
  }
}
