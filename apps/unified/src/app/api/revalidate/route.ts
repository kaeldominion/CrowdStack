import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * POST /api/revalidate
 * Trigger on-demand revalidation for cached pages
 *
 * Usage:
 * curl -X POST "https://crowdstack.app/api/revalidate" \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"path": "/e/event-slug"}'
 *
 * Or with tag:
 *   -d '{"tag": "event-gallery-808-jan-17-2026"}'
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { path, tag, type = "page" } = body;

    if (!path && !tag) {
      return NextResponse.json(
        { error: "Either 'path' or 'tag' is required" },
        { status: 400 }
      );
    }

    const results: string[] = [];

    if (path) {
      revalidatePath(path, type as "page" | "layout");
      results.push(`Revalidated path: ${path}`);
    }

    if (tag) {
      revalidateTag(tag);
      results.push(`Revalidated tag: ${tag}`);
    }

    console.log("[Revalidate]", results.join(", "));

    return NextResponse.json({
      success: true,
      revalidated: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revalidate" },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser testing (requires secret in query)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");
  const tag = searchParams.get("tag");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!path && !tag) {
    return NextResponse.json(
      { error: "Either 'path' or 'tag' query param is required" },
      { status: 400 }
    );
  }

  const results: string[] = [];

  if (path) {
    revalidatePath(path);
    results.push(`Revalidated path: ${path}`);
  }

  if (tag) {
    revalidateTag(tag);
    results.push(`Revalidated tag: ${tag}`);
  }

  return NextResponse.json({
    success: true,
    revalidated: results,
    timestamp: new Date().toISOString(),
  });
}
