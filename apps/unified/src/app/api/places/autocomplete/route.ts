import { NextRequest, NextResponse } from "next/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error("Google Maps API key not configured");
    return NextResponse.json(
      { error: "Location search not available" },
      { status: 500 }
    );
  }

  try {
    // Use Google Places Autocomplete API
    // Restrict to (cities) type for city-level results
    const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    url.searchParams.set("input", query);
    url.searchParams.set("types", "(cities)"); // Only return cities
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "OK" || data.status === "ZERO_RESULTS") {
      return NextResponse.json({
        predictions: data.predictions || [],
      });
    } else {
      console.error("Google Places API error:", data.status, data.error_message);
      return NextResponse.json(
        { error: "Location search failed", predictions: [] },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching place predictions:", error);
    return NextResponse.json(
      { error: "Location search failed", predictions: [] },
      { status: 500 }
    );
  }
}

