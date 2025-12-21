import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { uploadToStorage } from "@crowdstack/shared/storage/upload";

/**
 * POST /api/organizer/events/[eventId]/flier
 * Upload event flier/poster
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses Promise)
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

    // Check if user is superadmin
    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    const userIsSuperadmin = await userHasRole("superadmin");

    const organizerId = await getUserOrganizerId();
    
    // If not superadmin, require organizer account and verify ownership
    if (!userIsSuperadmin) {
      if (!organizerId) {
        return NextResponse.json(
          { error: "No organizer found for user" },
          { status: 404 }
        );
      }
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, flier_url")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error("Error fetching event:", eventError);
      return NextResponse.json(
        { error: `Event lookup failed: ${eventError.message}` },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check ownership only if not superadmin
    if (!userIsSuperadmin && event.organizer_id !== organizerId) {
      console.error("Organizer ID mismatch:", {
        eventOrganizerId: event.organizer_id,
        userOrganizerId: organizerId,
        eventId,
        userId: user.id,
      });
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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max for fliers)
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
    const storagePath = `events/${eventId}/flier/${fileName}`;

    // Upload to storage (using event-photos bucket for now, or create event-assets bucket)
    const fileBuffer = await file.arrayBuffer();
    const publicUrl = await uploadToStorage(
      "event-photos", // Using existing bucket, could create event-assets bucket later
      storagePath,
      Buffer.from(fileBuffer),
      file.type
    );

    // Delete old flier if exists
    if (event.flier_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = event.flier_url.split("/event-photos/");
        if (urlParts.length > 1) {
          await deleteFromStorage("event-photos", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete old flier:", storageError);
        // Continue even if deletion fails
      }
    }

    // Update event with flier URL
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ flier_url: publicUrl })
      .eq("id", eventId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update event flier" },
        { status: 500 }
      );
    }

    return NextResponse.json({ flier_url: publicUrl });
  } catch (error: any) {
    console.error("Failed to upload flier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload flier" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizer/events/[eventId]/flier
 * Remove event flier/poster
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 15+ uses Promise)
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

    // Check if user is superadmin
    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    const userIsSuperadmin = await userHasRole("superadmin");

    const organizerId = await getUserOrganizerId();
    
    // If not superadmin, require organizer account and verify ownership
    if (!userIsSuperadmin) {
      if (!organizerId) {
        return NextResponse.json(
          { error: "No organizer found for user" },
          { status: 404 }
        );
      }
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists and get flier URL
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, flier_url")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error("Error fetching event:", eventError);
      return NextResponse.json(
        { error: `Event lookup failed: ${eventError.message}` },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check ownership only if not superadmin
    if (!userIsSuperadmin && event.organizer_id !== organizerId) {
      console.error("Organizer ID mismatch:", {
        eventOrganizerId: event.organizer_id,
        userOrganizerId: organizerId,
        eventId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Access denied: Event does not belong to your organizer account" },
        { status: 403 }
      );
    }

    // Delete flier from storage if exists
    if (event.flier_url) {
      try {
        const { deleteFromStorage } = await import("@crowdstack/shared/storage/upload");
        const urlParts = event.flier_url.split("/event-photos/");
        if (urlParts.length > 1) {
          await deleteFromStorage("event-photos", urlParts[1]);
        }
      } catch (storageError) {
        console.error("Failed to delete flier from storage:", storageError);
        // Continue even if storage deletion fails - we'll still remove the URL
      }
    }

    // Update event to remove flier URL
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ flier_url: null })
      .eq("id", eventId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to remove flier from event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, flier_url: null });
  } catch (error: any) {
    console.error("Failed to delete flier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete flier" },
      { status: 500 }
    );
  }
}

