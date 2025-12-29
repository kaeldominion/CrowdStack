import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubeMetadata } from "@/lib/utils/youtube-metadata";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/dj/videos/metadata?url=...
 * Fetch YouTube video metadata (title, description, thumbnail)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
    }

    const metadata = await fetchYouTubeMetadata(url);

    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch video metadata. Please check the URL." },
        { status: 400 }
      );
    }

    return NextResponse.json({ metadata });
  } catch (error: any) {
    console.error("Error fetching YouTube metadata:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch video metadata" },
      { status: 500 }
    );
  }
}

