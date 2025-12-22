import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

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

    // Get venue with all fields
    const { data: venue, error: venueError } = await supabase
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
    const { data: gallery } = await supabase
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venueId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    // Get tags
    const { data: tags } = await supabase
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

    const body = await request.json();

    // Validate slug uniqueness if provided
    if (body.venue?.slug) {
      const { data: existingVenue } = await supabase
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
        "logo_url",
        "cover_image_url",
        "accent_color",
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
      ];

      for (const field of allowedFields) {
        if (field in body.venue) {
          let value = body.venue[field];
          
          // Normalize Instagram handle - extract just the username
          if (field === "instagram_url" && value) {
            value = normalizeInstagramHandle(value);
          }
          
          updateData[field] = value;
        }
      }

      updateData.updated_at = new Date().toISOString();

      const { data: updatedVenue, error: updateError } = await supabase
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
      await supabase.from("venue_tags").delete().eq("venue_id", venueId);

      // Insert new tags (filter out temp IDs)
      const tagsToInsert = body.tags
        .filter((tag: any) => !tag.id?.startsWith("temp-"))
        .map((tag: any) => ({
          venue_id: venueId,
          tag_type: tag.tag_type,
          tag_value: tag.tag_value,
        }));

      if (tagsToInsert.length > 0) {
        const { error: tagsError } = await supabase
          .from("venue_tags")
          .insert(tagsToInsert);

        if (tagsError) {
          return NextResponse.json(
            { error: tagsError.message || "Failed to update tags" },
            { status: 500 }
          );
        }
      }
    }

    // Reload full venue data
    const { data: venue } = await supabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    const { data: gallery } = await supabase
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venueId)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    const { data: tags } = await supabase
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

