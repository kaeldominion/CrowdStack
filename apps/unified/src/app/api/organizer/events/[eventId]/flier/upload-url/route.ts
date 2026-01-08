import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/organizer/events/[eventId]/flier/upload-url
 * Generate a signed URL for direct client-side upload to Supabase Storage
 * This bypasses Vercel's 4.5MB body size limit
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
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

    // Verify event exists and user has access
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (!userIsSuperadmin && event.organizer_id !== organizerId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get file info from query params
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");
    const fileType = searchParams.get("fileType");
    const fileSize = searchParams.get("fileSize");

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    if (fileSize) {
      const size = parseInt(fileSize, 10);
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (size > maxSize) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 }
        );
      }
    }

    // Generate unique filename
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `events/${eventId}/flier/${uniqueFileName}`;

    // Generate signed URL for upload (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await serviceSupabase
      .storage
      .from("event-photos")
      .createSignedUploadUrl(storagePath, {
        upsert: true,
      });

    if (signedUrlError || !signedUrlData) {
      console.error("Error creating signed upload URL:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: signedUrlData.signedUrl,
      path: signedUrlData.path,
      token: signedUrlData.token,
      storagePath,
    });
  } catch (error: any) {
    console.error("Failed to generate upload URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

