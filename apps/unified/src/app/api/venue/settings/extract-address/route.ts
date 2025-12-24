import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * Extract address components from Google Maps URL using Geocoding API
 */
async function extractAddressFromGoogleMapsUrl(url: string): Promise<{
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}> {
  try {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      console.error("Google Maps API key not configured");
      return { address: null, city: null, state: null, country: null };
    }

    // First, try to extract place ID directly from short URLs using Google Places API
    // This is more reliable than trying to resolve redirects
    let resolvedUrl = url;
    const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);
    
    // For short URLs, try to use Google Places API Find Place to get the place ID
    // This works better than trying to resolve redirects which may be blocked
    if (isShortUrl) {
      try {
        console.log(`Attempting to resolve short URL using Places API: ${url}`);
        
        // Try to extract any identifiable information from the short URL
        // Short URLs from Google Maps usually redirect to a place, so we'll try to
        // use the Places API Text Search as a fallback if we can't resolve the URL
        
        // First, try to resolve the URL (but don't fail if it doesn't work)
        try {
          const resolveResponse = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });
          
          if (resolveResponse.url && resolveResponse.url !== url) {
            resolvedUrl = resolveResponse.url;
            console.log(`Resolved short URL to: ${resolvedUrl}`);
          } else {
            console.warn("Short URL did not resolve to a different URL - may require authentication");
            // Continue with original URL - we'll try to extract place ID or use alternative methods
          }
        } catch (resolveError: any) {
          console.warn(`Could not resolve short URL (this is OK, we'll try other methods): ${resolveError.message}`);
          // Continue with original URL
        }
      } catch (error: any) {
        console.error("Error processing short URL:", error.message);
        // Continue with original URL
      }
    }

    // Try multiple methods to extract location info from URL
    
    // Method 1: Extract coordinates from URL (most reliable)
    // Try multiple coordinate patterns
    const coordsPatterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,  // Standard @lat,lng
      /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,  // Alternative format !3dlat!4dlng
      /@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+)/,  // @lat,lng,zoom
    ];
    
    let geocodeUrl: string | null = null;
    let coordsMatch: RegExpMatchArray | null = null;
    
    for (const pattern of coordsPatterns) {
      coordsMatch = resolvedUrl.match(pattern);
      if (coordsMatch) break;
    }
    
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      console.log(`Extracted coordinates: ${lat}, ${lng}`);
      geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`;
    } else {
      // Method 2: Extract place ID from URL patterns
      // Google Maps URLs can have place IDs in various formats:
      // - /place/PlaceName/@lat,lng,zoom/data=!4m6!3m5!1sPLACE_ID
      // - ?cid=PLACE_ID
      // - /place/PlaceName/PLACE_ID
      let placeId: string | null = null;
      
      // Try to extract from data parameter (most common in short link resolutions)
      const dataMatch = resolvedUrl.match(/data=!4m[^!]*!1s([A-Za-z0-9_-]+)/);
      if (dataMatch) {
        placeId = dataMatch[1];
      }
      
      // Try cid parameter
      if (!placeId) {
        const cidMatch = resolvedUrl.match(/[?&]cid=([A-Za-z0-9_-]+)/);
        if (cidMatch) {
          placeId = cidMatch[1];
        }
      }
      
      // Try place ID after /place/ in URL like /place/Name/PLACE_ID
      if (!placeId) {
        const placeIdMatch = resolvedUrl.match(/\/place\/[^/]+\/([A-Za-z0-9_-]{27,})/);
        if (placeIdMatch) {
          placeId = placeIdMatch[1];
        }
      }
      
      if (placeId) {
        console.log(`Extracted place ID: ${placeId}`);
        // Use Place Details API to get address and coordinates
        // First get place details to extract coordinates
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address,address_components&key=${googleMapsApiKey}`;
        
        try {
          const placeDetailsResponse = await fetch(placeDetailsUrl);
          const placeDetailsData = await placeDetailsResponse.json();
          
          if (placeDetailsData.status === "OK" && placeDetailsData.result) {
            // If we have coordinates, use reverse geocoding for better results
            if (placeDetailsData.result.geometry?.location) {
              const lat = placeDetailsData.result.geometry.location.lat;
              const lng = placeDetailsData.result.geometry.location.lng;
              console.log(`Got coordinates from place details: ${lat}, ${lng}`);
              geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`;
            } else {
              // Use place details directly
              geocodeUrl = placeDetailsUrl;
            }
          } else {
            console.warn(`Place Details API failed: ${placeDetailsData.status}`);
            // Fall back to using place details URL anyway
            geocodeUrl = placeDetailsUrl;
          }
        } catch (error: any) {
          console.error("Error fetching place details:", error.message);
          // Fall back to using place details URL
          geocodeUrl = placeDetailsUrl;
        }
      } else {
        // Method 3: Extract place name from URL pattern like /place/PlaceName
        const placeMatch = resolvedUrl.match(/\/place\/([^/@\?]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
          console.log(`Extracted place name: ${placeName}`);
          geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeName)}&key=${googleMapsApiKey}`;
        } else {
          // Method 4: Extract query parameter from ?q= or &q=
          const queryMatch = resolvedUrl.match(/[?&]q=([^&]+)/);
          if (queryMatch) {
            const query = decodeURIComponent(queryMatch[1]);
            console.log(`Extracted query: ${query}`);
            geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
          }
        }
      }
    }

    if (!geocodeUrl) {
      console.error("Could not extract location from URL format. Original:", url, "Resolved:", resolvedUrl);
      return { address: null, city: null, state: null, country: null };
    }

    // Call Google Geocoding API or Place Details API
    console.log(`Calling geocoding API: ${geocodeUrl.replace(googleMapsApiKey, 'REDACTED')}`);
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK") {
      console.error("Geocoding failed:", geocodeData.status, geocodeData.error_message || "");
      return { address: null, city: null, state: null, country: null };
    }

    // Handle Place Details API response format (different from Geocoding API)
    let result: any;
    if (geocodeData.result) {
      // Place Details API response
      result = {
        address_components: geocodeData.result.address_components || [],
        formatted_address: geocodeData.result.formatted_address || null,
      };
    } else if (geocodeData.results && geocodeData.results.length > 0) {
      // Geocoding API response
      result = geocodeData.results[0];
    } else {
      console.error("No results in geocoding response");
      return { address: null, city: null, state: null, country: null };
    }
    const addressComponents = result.address_components || [];
    
    let address: string | null = null;
    let city: string | null = null;
    let state: string | null = null;
    let country: string | null = null;

    // Extract street address (street_number + route + postal_code)
    const streetNumber = addressComponents.find((c: any) => c.types.includes("street_number"))?.long_name;
    const route = addressComponents.find((c: any) => c.types.includes("route"))?.long_name;
    const postalCode = addressComponents.find((c: any) => c.types.includes("postal_code"))?.long_name;
    
    const addressParts = [streetNumber, route].filter(Boolean);
    if (addressParts.length > 0) {
      address = addressParts.join(" ");
      // Append postal code if available
      if (postalCode) {
        address = `${address}, ${postalCode}`;
      }
    } else if (result.formatted_address) {
      // Fallback to formatted address if we can't parse components
      // Try to extract just the street address part (before first comma typically)
      const parts = result.formatted_address.split(",");
      address = parts[0]?.trim() || result.formatted_address;
      
      // If we have postal code in components but no street/route, try to append it
      if (postalCode && address && !address.includes(postalCode)) {
        address = `${address}, ${postalCode}`;
      }
    }

    // Extract city (locality or administrative_area_level_2)
    city = addressComponents.find((c: any) => 
      c.types.includes("locality")
    )?.long_name || addressComponents.find((c: any) => 
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
    
    // Log what we extracted for debugging
    console.log(`Parsed address components:`, { address, city, state, country, hasFormatted: !!result.formatted_address });

    return {
      address,
      city,
      state,
      country,
    };
  } catch (error: any) {
    console.error("Error extracting address from Google Maps URL:", error);
    // Re-throw if it's a configuration error, otherwise return nulls
    if (error.message && error.message.includes("API key")) {
      throw error;
    }
    return { address: null, city: null, state: null, country: null };
  }
}

/**
 * POST /api/venue/settings/extract-address
 * Extract address from Google Maps URL and update venue
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    const isVenueAdmin = await userHasRoleOrSuperadmin("venue_admin");
    
    if (!isSuperadmin && !isVenueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get venueId from query param (for admin) or from user's venue (for venue admin)
    const { searchParams } = new URL(request.url);
    const venueIdParam = searchParams.get("venueId");
    
    let venueId: string | null = null;
    
    if (venueIdParam && isSuperadmin) {
      venueId = venueIdParam;
    } else if (isVenueAdmin) {
      venueId = await getUserVenueId();
    }
    
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    // Get Google Maps URL from request body (if provided) or from database
    let body: any = {};
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch (error) {
      console.warn("Could not parse request body, will try database:", error);
    }
    
    let googleMapsUrl: string | null = body.google_maps_url || null;
    
    // Trim whitespace if present
    if (googleMapsUrl) {
      googleMapsUrl = googleMapsUrl.trim();
      if (googleMapsUrl === "") {
        googleMapsUrl = null;
      }
    }

    // If not provided in body, get from database
    if (!googleMapsUrl) {
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("google_maps_url")
        .eq("id", venueId)
        .single();

      if (venueError || !venue) {
        return NextResponse.json(
          { error: "Venue not found" },
          { status: 404 }
        );
      }

      googleMapsUrl = venue.google_maps_url;
    }

    if (!googleMapsUrl || googleMapsUrl.trim() === "") {
      return NextResponse.json(
        { error: "Google Maps URL is required. Please add a Google Maps URL first." },
        { status: 400 }
      );
    }

    // Trim the URL - at this point we know it's not null
    const trimmedUrl = googleMapsUrl.trim();

    // Save the URL to database if it was provided in the request body and is different
    if (body.google_maps_url && body.google_maps_url.trim() !== trimmedUrl) {
      const trimmedBodyUrl = body.google_maps_url.trim();
      const { error: saveUrlError } = await supabase
        .from("venues")
        .update({ 
          google_maps_url: trimmedBodyUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", venueId);
      
      if (saveUrlError) {
        console.error("Failed to save Google Maps URL:", saveUrlError);
      }
    }

    // Extract address from Google Maps URL
    // Use the trimmed URL which is guaranteed to be a non-empty string
    console.log(`Extracting address from Google Maps URL: ${trimmedUrl}`);
    const addressInfo = await extractAddressFromGoogleMapsUrl(trimmedUrl);
    console.log(`Extracted address info:`, addressInfo);

    if (!addressInfo.address && !addressInfo.city) {
      // Provide more helpful error message for short links
      const isShortLink = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(trimmedUrl);
      const errorMessage = isShortLink
        ? `Could not extract address from short Google Maps URL. Short links from Google Maps profiles should work, but if the link is private or requires authentication, it may fail. Please check the server logs for details, or try using a full Google Maps URL instead.`
        : `Could not extract address from Google Maps URL. The URL format may not be supported, or the geocoding API may have failed. Please check the server logs for details.`;
      
      return NextResponse.json(
        { 
          error: errorMessage,
          url: trimmedUrl, // Include URL in response for debugging
        },
        { status: 400 }
      );
    }

    // Update venue with extracted address
    const { data: updatedVenue, error: updateError } = await supabase
      .from("venues")
      .update({
        address: addressInfo.address,
        city: addressInfo.city,
        state: addressInfo.state,
        country: addressInfo.country,
        updated_at: new Date().toISOString(),
      })
      .eq("id", venueId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update address" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      address: addressInfo,
      venue: updatedVenue,
    });
  } catch (error: any) {
    console.error("Failed to extract address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract address" },
      { status: 500 }
    );
  }
}

