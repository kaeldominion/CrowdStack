import { NextRequest, NextResponse } from "next/server";

/**
 * API route to resolve short Google Maps URLs and extract coordinates
 * This helps with embedding maps when users provide short URLs like maps.app.goo.gl/XXXX
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Check if it's a short URL (maps.app.goo.gl or goo.gl/maps)
    const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);

    if (!isShortUrl) {
      // Not a short URL, try to extract coordinates directly
      const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordsMatch) {
        return NextResponse.json({
          resolved: url,
          coordinates: {
            lat: parseFloat(coordsMatch[1]),
            lng: parseFloat(coordsMatch[2]),
          },
        });
      }
      return NextResponse.json({ resolved: url, coordinates: null });
    }

    // For short URLs, we'll resolve them by following redirects
    // Note: This requires the URL to be publicly accessible
    // Use GET instead of HEAD because some short URL services don't support HEAD
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CrowdStack/1.0)",
      },
    });

    const resolvedUrl = response.url || url;

    // Extract coordinates from resolved URL
    const coordsMatch = resolvedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const coordinates = coordsMatch
      ? {
          lat: parseFloat(coordsMatch[1]),
          lng: parseFloat(coordsMatch[2]),
        }
      : null;

    return NextResponse.json({
      resolved: resolvedUrl,
      coordinates,
      original: url,
    });
  } catch (error: any) {
    console.error("Error resolving Google Maps URL:", error);
    // Return the original URL even if resolution fails
    return NextResponse.json({
      resolved: url,
      coordinates: null,
      error: error.message,
    });
  }
}

