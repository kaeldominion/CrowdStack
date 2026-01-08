import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref");
    
    if (!ref) {
      return NextResponse.json(
        { error: "ref parameter required (e.g., ?ref=org_123)" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const chain: any = {
      ref,
      steps: [],
    };

    // Handle org_ prefix
    if (ref.startsWith("org_")) {
      const organizerId = ref.substring(4);
      chain.type = "organizer_referral";
      chain.organizerId = organizerId;

      // Step 1: Look up organizer
      const { data: organizer, error: orgError } = await supabase
        .from("organizers")
        .select("id, name, created_by, created_at")
        .eq("id", organizerId)
        .single();
      
      chain.steps.push({
        step: 1,
        action: "Look up organizer",
        data: organizer || null,
        error: orgError?.message || null,
      });

      if (organizer) {
        chain.organizerName = organizer.name;
        chain.organizerCreatedBy = organizer.created_by;

        // Step 2: Look up organizer owner (auth user)
        if (organizer.created_by) {
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(organizer.created_by);
          
          chain.steps.push({
            step: 2,
            action: "Look up organizer owner (auth user)",
            data: user ? {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name,
              created_at: user.created_at,
            } : null,
            error: userError?.message || null,
          });

          chain.ownerUserId = organizer.created_by;
          chain.ownerEmail = user?.email;
          chain.ownerName = user?.user_metadata?.name;

          // Step 3: Look up organizer owner's promoter profile
          const { data: promoter, error: promError } = await supabase
            .from("promoters")
            .select("id, name, email, created_by, created_at")
            .eq("created_by", organizer.created_by)
            .maybeSingle();
          
          chain.steps.push({
            step: 3,
            action: "Look up organizer owner's promoter profile",
            data: promoter || null,
            error: promError?.message || null,
          });

          if (promoter) {
            chain.promoterProfileName = promoter.name;
            chain.promoterProfileId = promoter.id;
            chain.finalName = promoter.name; // This is what gets displayed!
          } else {
            chain.finalName = organizer.name; // Fallback to organizer name
          }

          // Step 4: Check if owner has an attendee record
          const { data: attendee, error: attError } = await supabase
            .from("attendees")
            .select("id, name, email, user_id")
            .eq("user_id", organizer.created_by)
            .maybeSingle();
          
          chain.steps.push({
            step: 4,
            action: "Look up organizer owner's attendee record",
            data: attendee || null,
            error: attError?.message || null,
          });

          if (attendee) {
            chain.attendeeRecordName = attendee.name;
            chain.attendeeRecordEmail = attendee.email;
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: "Only org_ prefix is currently supported" },
        { status: 400 }
      );
    }

    // Summary
    chain.summary = {
      displayedName: chain.finalName || chain.organizerName || "Unknown",
      source: chain.promoterProfileName 
        ? "Organizer owner's promoter profile" 
        : chain.organizerName 
        ? "Organizer name" 
        : "Not found",
      organizerName: chain.organizerName,
      organizerOwnerEmail: chain.ownerEmail,
      organizerOwnerName: chain.ownerName,
      promoterProfileName: chain.promoterProfileName,
      attendeeRecordName: chain.attendeeRecordName,
    };

    return NextResponse.json(chain);
  } catch (error: any) {
    console.error("[Decode Ref Chain] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to decode ref chain" },
      { status: 500 }
    );
  }
}

