import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/auth/status
 * Check if the current user is authenticated
 * Returns minimal info needed for client-side UI decisions
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.json({
        isAuthenticated: true,
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || null,
      });
    }

    return NextResponse.json({
      isAuthenticated: false,
      userId: null,
      email: null,
      name: null,
    });
  } catch (error) {
    // If there's an error checking auth, assume not authenticated
    return NextResponse.json({
      isAuthenticated: false,
      userId: null,
      email: null,
      name: null,
    });
  }
}

