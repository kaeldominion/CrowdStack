import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/organizer/events/[eventId]/cover
 * Upload event cover image
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    const hasAccess = await userHasRoleOrSuperadmin("event_organizer");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found for user" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to this organizer
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, cover_image_url")
      .eq("id", params.eventId)
      .single();

    if (!event || event.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `events/${params.eventId}/cover/${fileName}`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "event-photos", // Using existing bucket
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Delete old cover image if exists
    if (event.cover_image_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = event.cover_image_url.split("/event-photos/");
        if (urlParts.length > 1) {
          await deleteFromStorage("event-photos", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete old cover image:", storageError);
        // Continue even if deletion fails
      }
    }

    // Update event with cover image URL
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ cover_image_url: publicUrl })
      .eq("id", params.eventId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update event cover image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ cover_image_url: publicUrl });
  } catch (error: any) {
    console.error("Failed to upload cover image:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload cover image" },
      { status: 500 }
    );
  }
}

