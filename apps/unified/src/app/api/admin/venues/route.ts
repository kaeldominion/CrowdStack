import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.NODE_ENV === "development") {
    console.log("[API Admin Venues] GET request received");
  }
  
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] All cookies:", allCookies.map(c => c.name).join(", "));
    }
    
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Supabase getUser result:", {
        hasUser: !!user,
        userEmail: user?.email,
        error: userError?.message,
      });
    }

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
    if (!userId) {
      if (process.env.NODE_ENV === "development") {
        console.log("[API Admin Venues] No user from Supabase, checking localhost cookie");
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
      const authCookieName = `sb-${projectRef}-auth-token`;
      const authCookie = cookieStore.get(authCookieName);
      
      if (process.env.NODE_ENV === "development") {
        console.log("[API Admin Venues] Looking for cookie:", authCookieName);
        console.log("[API Admin Venues] Cookie found:", !!authCookie);
      }

      if (authCookie) {
        try {
          const cookieValue = decodeURIComponent(authCookie.value);
          const parsed = JSON.parse(cookieValue);
          if (process.env.NODE_ENV === "development") {
            console.log("[API Admin Venues] Parsed cookie, has user:", !!parsed.user);
          }
          if (parsed.user?.id) {
            userId = parsed.user.id;
            if (process.env.NODE_ENV === "development") {
              console.log("[API Admin Venues] Got userId from cookie:", userId);
            }
          }
        } catch (e) {
          console.error("[API Admin Venues] Cookie parse error:", e);
        }
      }
    }

    if (!userId) {
      console.error("[API Admin Venues] No userId found, returning 401");
      return NextResponse.json({ error: "Unauthorized - no user ID found" }, { status: 401 });
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] User ID:", userId);
    }

    // Check role using service role to bypass RLS
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Checking roles for user:", userId);
    }
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles, error: rolesError } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Roles query result:", {
        roles: userRoles,
        error: rolesError?.message,
      });
    }
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] User roles:", roles);
      console.log("[API Admin Venues] Is superadmin:", isSuperadmin);
    }

    if (!isSuperadmin) {
      console.error("[API Admin Venues] User is not superadmin, returning 403");
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required",
        yourRoles: roles 
      }, { status: 403 });
    }

    // Get all venues
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Fetching venues from database...");
    }
    const { data: venues, error } = await serviceSupabase
      .from("venues")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Venues query result:", {
        count: venues?.length || 0,
        error: error?.message,
      });
    }

    if (error) {
      throw error;
    }

    // Get event counts for each venue
    const venuesWithCounts = await Promise.all(
      (venues || []).map(async (venue: any) => {
        const { count } = await serviceSupabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venue.id);

        return {
          ...venue,
          events_count: count || 0,
        };
      })
    );

    if (process.env.NODE_ENV === "development") {
      console.log("[API Admin Venues] Returning success response with", venuesWithCounts.length, "venues");
    }
    return NextResponse.json({ venues: venuesWithCounts });
  } catch (error: any) {
    console.error("[API Admin Venues] ERROR:", error);
    console.error("[API Admin Venues] Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to fetch venues", details: error.toString() },
      { status: 500 }
    );
  }
}

