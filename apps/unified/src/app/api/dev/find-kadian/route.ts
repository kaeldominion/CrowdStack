import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { createClient } from "@supabase/supabase-js";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const env = searchParams.get("env") || "local"; // local, beta, or prod
    
    // Use production database if requested
    let supabase;
    if (env === "prod") {
      const prodUrl = process.env.PROD_SUPABASE_URL || "https://fvrjcyscwibrqpsviblx.supabase.co";
      const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
      if (!prodKey) {
        return NextResponse.json(
          { error: "PROD_SUPABASE_SERVICE_ROLE_KEY not configured" },
          { status: 500 }
        );
      }
      supabase = createClient(prodUrl, prodKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      supabase = createServiceRoleClient();
    }
    const results: any = {
      organizers: [],
      promoters: [],
      attendees: [],
      events: [],
      authUsers: [],
    };

    // Search organizers
    const { data: organizers, error: orgError } = await supabase
      .from("organizers")
      .select("id, name, created_by, created_at")
      .ilike("name", "%kadian%");
    
    if (!orgError && organizers) {
      results.organizers = organizers;
    }

    // Search promoters
    const { data: promoters, error: promError } = await supabase
      .from("promoters")
      .select("id, name, email, created_by, created_at")
      .ilike("name", "%kadian%");
    
    if (!promError && promoters) {
      results.promoters = promoters;
    }

    // Search attendees
    const { data: attendees, error: attError } = await supabase
      .from("attendees")
      .select("id, name, email, user_id, created_at")
      .ilike("name", "%kadian%");
    
    if (!attError && attendees) {
      results.attendees = attendees;
    }

    // Get recent events and their organizer names
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, name, organizer_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (!eventsError && events) {
      for (const event of events) {
        if (event.organizer_id) {
          const { data: org } = await supabase
            .from("organizers")
            .select("id, name")
            .eq("id", event.organizer_id)
            .single();
          
          results.events.push({
            event_id: event.id,
            event_name: event.name,
            organizer_id: event.organizer_id,
            organizer_name: org?.name || "NOT FOUND",
            created_at: event.created_at,
          });
        }
      }
    }

    // Check auth users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (!usersError && users) {
      const kadianUsers = users.filter(u => 
        u.email?.toLowerCase().includes("kadian") || 
        u.user_metadata?.name?.toLowerCase().includes("kadian")
      );
      results.authUsers = kadianUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.name,
        created_at: u.created_at,
      }));
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("[Find Kadian] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search database" },
      { status: 500 }
    );
  }
}

