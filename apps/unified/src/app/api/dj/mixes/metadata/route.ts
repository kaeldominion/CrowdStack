import { NextRequest, NextResponse } from "next/server";
import { fetchSoundCloudMetadata } from "@/lib/utils/soundcloud-metadata";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/dj/mixes/metadata?url=...
 * Fetch SoundCloud track metadata (title, description, thumbnail)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "SoundCloud URL is required" }, { status: 400 });
    }

    const metadata = await fetchSoundCloudMetadata(url);

    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch track metadata. Please check the URL." },
        { status: 400 }
      );
    }

    return NextResponse.json({ metadata });
  } catch (error: any) {
    console.error("Error fetching SoundCloud metadata:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch track metadata" },
      { status: 500 }
    );
  }
}



