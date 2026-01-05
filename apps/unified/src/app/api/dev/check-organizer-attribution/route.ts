import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const organizerId = searchParams.get("organizerId");
    
    if (!userId && !organizerId) {
      return NextResponse.json(
        { error: "userId or organizerId required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const results: any = {};

    // If userId provided, find their organizer associations
    if (userId) {
      // Check if user is in organizer_team_members
      const { data: teamMemberships } = await supabase
        .from("organizer_team_members")
        .select("organizer_id, role, organizers(id, name, created_by)")
        .eq("user_id", userId);
      
      results.teamMemberships = teamMemberships || [];

      // Check if user created any organizers
      const { data: createdOrganizers } = await supabase
        .from("organizers")
        .select("id, name, created_by")
        .eq("created_by", userId);
      
      results.createdOrganizers = createdOrganizers || [];

      // Check if user has a promoter profile
      const { data: promoter } = await supabase
        .from("promoters")
        .select("id, name, email, created_by")
        .eq("created_by", userId)
        .maybeSingle();
      
      results.promoterProfile = promoter || null;

      // Get user's auth info
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      results.authUser = user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      } : null;
    }

    // If organizerId provided, get full organizer details
    if (organizerId) {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("id, name, created_by")
        .eq("id", organizerId)
        .single();
      
      results.organizer = organizer || null;

      if (organizer?.created_by) {
        // Get organizer owner's auth info
        const { data: { user } } = await supabase.auth.admin.getUserById(organizer.created_by);
        results.organizerOwner = user ? {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
        } : null;

        // Check if organizer owner has a promoter profile
        const { data: promoter } = await supabase
          .from("promoters")
          .select("id, name, email")
          .eq("created_by", organizer.created_by)
          .maybeSingle();
        
        results.organizerOwnerPromoter = promoter || null;
      }

      // Get all team members
      const { data: teamMembers } = await supabase
        .from("organizer_team_members")
        .select("user_id, role, attendees(id, name, email)")
        .eq("organizer_id", organizerId);
      
      results.teamMembers = teamMembers || [];
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("[Check Organizer Attribution] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check attribution" },
      { status: 500 }
    );
  }
}

