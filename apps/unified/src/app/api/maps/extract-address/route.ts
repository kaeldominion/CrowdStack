import { NextRequest, NextResponse } from "next/server";

/**
 * API route to extract address components from Google Maps URL
 * Uses Google Maps Geocoding API to reverse geocode coordinates
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured" },
      { status: 500 }
    );
  }

  try {
    // First, resolve short URLs if needed
    let resolvedUrl = url;
    const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);
    
    if (isShortUrl) {
      try {
        // Resolve short URL by following redirects
        const resolveResponse = await fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; CrowdStack/1.0)",
          },
        });
        resolvedUrl = resolveResponse.url || url;
      } catch (error) {
        console.error("Error resolving short URL:", error);
        // Continue with original URL
      }
    }

    // Extract coordinates from URL
    const coordsMatch = resolvedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    
    if (!coordsMatch) {
      return NextResponse.json(
        { error: "Could not extract coordinates from URL" },
        { status: 400 }
      );
    }

    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);

    // Use Google Geocoding API to reverse geocode
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK" || !geocodeData.results || geocodeData.results.length === 0) {
      return NextResponse.json(
        { error: "Geocoding failed", details: geocodeData.status },
        { status: 400 }
      );
    }

    // Parse address components from the first result
    const result = geocodeData.results[0];
    const addressComponents = result.address_components || [];
    
    let address: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let country: string | null = null;

    // Extract street address (street_number + route)
    const streetNumber = addressComponents.find((c: any) => c.types.includes("street_number"))?.long_name;
    const route = addressComponents.find((c: any) => c.types.includes("route"))?.long_name;
    if (streetNumber || route) {
      address = [streetNumber, route].filter(Boolean).join(" ");
    }

    // Extract city (locality or administrative_area_level_2)
    city = addressComponents.find((c: any) => 
      c.types.includes("locality") || 
      c.types.includes("administrative_area_level_2")
    )?.long_name || null;

    // Extract state (administrative_area_level_1)
    state = addressComponents.find((c: any) => 
      c.types.includes("administrative_area_level_1")
    )?.short_name || null;

    // Extract country
    const countryComponent = addressComponents.find((c: any) => 
      c.types.includes("country")
    );
    country = countryComponent?.short_name || null;

    return NextResponse.json({
      address: address || result.formatted_address || null,
      city,
      state,
      country,
      formatted_address: result.formatted_address,
    });
  } catch (error: any) {
    console.error("Error extracting address from Google Maps URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract address" },
      { status: 500 }
    );
  }
}

