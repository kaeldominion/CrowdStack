import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

// Force dynamic rendering since we use cookies for authentication
export const dynamic = 'force-dynamic';

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

    // First, resolve short URLs if needed
    let resolvedUrl = url;
    const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);
    
    if (isShortUrl) {
      try {
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
      console.error("Could not extract coordinates from URL:", resolvedUrl);
      return { address: null, city: null, state: null, country: null };
    }

    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);

    // Use Google Geocoding API to reverse geocode
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`;
    
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== "OK" || !geocodeData.results || geocodeData.results.length === 0) {
      console.error("Geocoding failed:", geocodeData.status);
      return { address: null, city: null, state: null, country: null };
    }

    // Parse address components from the first result
    const result = geocodeData.results[0];
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
    } else {
      // Fallback to formatted address if we can't parse components
      address = result.formatted_address || null;
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

    return {
      address,
      city,
      state,
      country,
    };
  } catch (error) {
    console.error("Error extracting address from Google Maps URL:", error);
    return { address: null, city: null, state: null, country: null };
  }
}

/**
 * Normalize Instagram input to just the username (without @ or URL parts)
 * Accepts: @username, username, https://instagram.com/username, https://www.instagram.com/username/
 */
function normalizeInstagramHandle(input: string): string {
  if (!input) return "";
  
  let handle = input.trim();
  
  // Remove @ prefix if present
  if (handle.startsWith("@")) {
    handle = handle.slice(1);
  }
  
  // Extract username from URL patterns
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?\#]+)/i,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/([^\/\?\#]+)/i,
  ];
  
  for (const pattern of urlPatterns) {
    const match = handle.match(pattern);
    if (match && match[1]) {
      handle = match[1];
      break;
    }
  }
  
  // Remove any trailing slashes or query params that might remain
  handle = handle.split(/[\/\?\#]/)[0];
  
  return handle;
}

/**
 * GET /api/venue/settings
 * Get venue settings (for logged-in venue admin or superadmin)
 * Query params: ?venueId=xxx (optional, for admin access)
 */
export async function GET(request: NextRequest) {
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
      // Superadmin can access any venue via query param
      venueId = venueIdParam;
    } else if (isVenueAdmin) {
      // Venue admin gets their own venue
      venueId = await getUserVenueId();
    }
    
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    // Use service role client for superadmin operations to bypass RLS
    const { createServiceRoleClient } = await import("@crowdstack/shared/supabase/server");
    const dbClient = isSuperadmin ? createServiceRoleClient() : supabase;

    // Get venue with all fields
    const { data: venue, error: venueError } = await dbClient
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    // Get gallery images
    const { data: gallery } = await dbClient
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venueId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    // Get tags
    const { data: tags } = await dbClient
      .from("venue_tags")
      .select("*")
      .eq("venue_id", venueId)
      .order("tag_type", { ascending: true })
      .order("tag_value", { ascending: true });

    return NextResponse.json({
      venue: {
        ...venue,
        gallery: gallery || [],
        tags: tags || [],
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch venue settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch venue settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/venue/settings
 * Update venue settings
 * Query params: ?venueId=xxx (optional, for admin access)
 */
export async function PUT(request: NextRequest) {
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
      // Superadmin can access any venue via query param
      venueId = venueIdParam;
    } else if (isVenueAdmin) {
      // Venue admin gets their own venue
      venueId = await getUserVenueId();
    }
    
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    // Use service role client for superadmin operations to bypass RLS
    // This allows superadmins to update any venue, even if not assigned via venue_users
    const { createServiceRoleClient } = await import("@crowdstack/shared/supabase/server");
    const dbClient = isSuperadmin ? createServiceRoleClient() : supabase;

    const body = await request.json();

    // Validate slug uniqueness if provided
    if (body.venue?.slug) {
      const { data: existingVenue } = await dbClient
        .from("venues")
        .select("id")
        .eq("slug", body.venue.slug)
        .neq("id", venueId)
        .single();

      if (existingVenue) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
    }

    // Update venue
    if (body.venue) {
      // Get current venue data to compare
      const { data: currentVenue } = await dbClient
        .from("venues")
        .select("google_maps_url, address, city, state, country")
        .eq("id", venueId)
        .single();

      const updateData: any = {};
      const allowedFields = [
        "name",
        "slug",
        "tagline",
        "description",
        "address",
        "city",
        "state",
        "country",
        "phone",
        "email",
        "website",
        "instagram_url",
        "instagram_handle",
        "logo_url",
        "cover_image_url",
        "latitude",
        "longitude",
        "google_maps_url",
        "dress_code",
        "age_restriction",
        "entry_notes",
        "table_min_spend_notes",
        "default_registration_questions",
        "default_commission_rules",
        "default_message_templates",
        "base_currency",
      ];

      // Process allowed fields (no automatic address extraction - user must use "Update Address" button)
      for (const field of allowedFields) {
        if (field in body.venue) {
          let value = body.venue[field];
          
          // Convert empty strings to null for optional fields (except country which has a default)
          if (value === "" && field !== "country") {
            value = null;
          }
          
          // Normalize Instagram handle - extract just the username
          if (field === "instagram_url" && value) {
            value = normalizeInstagramHandle(value);
          }
          
          updateData[field] = value;
        }
      }

      updateData.updated_at = new Date().toISOString();

      const { data: updatedVenue, error: updateError } = await dbClient
        .from("venues")
        .update(updateData)
        .eq("id", venueId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Failed to update venue" },
          { status: 500 }
        );
      }
    }

    // Update tags if provided
    if (body.tags && Array.isArray(body.tags)) {
      // Delete all existing tags
      await dbClient.from("venue_tags").delete().eq("venue_id", venueId);

      // Insert all tags (including new ones with temp IDs)
      const tagsToInsert = body.tags
        .filter((tag: any) => tag.tag_type && tag.tag_value)
        .map((tag: any) => ({
          venue_id: venueId,
          tag_type: tag.tag_type,
          tag_value: tag.tag_value,
        }));

      if (tagsToInsert.length > 0) {
        const { error: tagsError } = await dbClient
          .from("venue_tags")
          .insert(tagsToInsert);

        if (tagsError) {
          console.error("Failed to insert tags:", tagsError);
          return NextResponse.json(
            { error: tagsError.message || "Failed to update tags" },
            { status: 500 }
          );
        }
      }
    }

    // Reload full venue data
    const { data: venue } = await dbClient
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    const { data: gallery } = await dbClient
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venueId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    const { data: tags } = await dbClient
      .from("venue_tags")
      .select("*")
      .eq("venue_id", venueId)
      .order("tag_type", { ascending: true })
      .order("tag_value", { ascending: true });

    return NextResponse.json({
      venue: {
        ...venue,
        gallery: gallery || [],
        tags: tags || [],
      },
    });
  } catch (error: any) {
    console.error("Failed to update venue settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update venue settings" },
      { status: 500 }
    );
  }
}

