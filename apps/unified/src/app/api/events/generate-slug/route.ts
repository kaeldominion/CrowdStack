import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * Generate a unique slug from a base slug by appending numbers if necessary
 */
async function generateUniqueSlug(
  supabase: ReturnType<typeof createServiceRoleClient>,
  baseSlug: string
): Promise<string> {
  // First, check if the base slug is available
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("slug", baseSlug)
    .single();

  if (!existing) {
    return baseSlug;
  }

  // If it exists, try appending numbers until we find an available one
  let counter = 2;
  let candidateSlug = `${baseSlug}-${counter}`;

  while (true) {
    const { data: existingWithNumber } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidateSlug)
      .single();

    if (!existingWithNumber) {
      return candidateSlug;
    }

    counter++;
    candidateSlug = `${baseSlug}-${counter}`;

    // Safety check to prevent infinite loops
    if (counter > 1000) {
      // Fall back to using a timestamp
      return `${baseSlug}-${Date.now()}`;
    }
  }
}

/**
 * Generate a slug from an event name
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Format date for slug (e.g., "dec-29-2025")
 */
function formatDateForSlug(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, baseSlug, startDate } = body;

    if (!name && !baseSlug) {
      return NextResponse.json(
        { error: "Either 'name' or 'baseSlug' is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    
    // Generate base slug from name if provided, otherwise use baseSlug
    let slugBase = baseSlug || generateSlugFromName(name);
    
    // Append date if provided (e.g., "event-name-dec-29-2025")
    if (startDate) {
      const dateSlug = formatDateForSlug(startDate);
      if (dateSlug) {
        slugBase = `${slugBase}-${dateSlug}`;
      }
    }

    if (!slugBase) {
      return NextResponse.json(
        { error: "Unable to generate slug from provided input" },
        { status: 400 }
      );
    }

    // Generate unique slug
    const uniqueSlug = await generateUniqueSlug(serviceSupabase, slugBase);

    return NextResponse.json({ slug: uniqueSlug });
  } catch (error: any) {
    console.error("Error generating unique slug:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate unique slug" },
      { status: 500 }
    );
  }
}

