import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

export type ReferralSource = "direct" | "venue" | "organizer" | "promoter" | "user_referral";

interface AttendeeWithSource {
  id: string;
  attendee_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  registration_date: string;
  checked_in: boolean;
  check_in_time: string | null;
  referral_source: ReferralSource;
  promoter_id: string | null;
  promoter_name: string | null;
  referred_by_user_id: string | null;
  referred_by_user_name: string | null;
}

/**
 * GET /api/events/[eventId]/attendees
 * Get all attendees registered for this event
 * Supports filtering by source and promoter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;
  const { searchParams } = new URL(request.url);
  const promoterId = searchParams.get("promoter_id");
  const source = searchParams.get("source") as ReferralSource | null;
  const status = searchParams.get("status"); // "registered" | "checked_in" | "not_checked_in"
  
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user roles
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    const isVenueAdmin = roles.includes("venue_admin");
    const isOrganizer = roles.includes("event_organizer");
    const isPromoter = roles.includes("promoter");

    // Get event details for access check
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check access permissions
    let hasAccess = isSuperadmin;
    let userPromoterId: string | null = null;
    let userOrganizerId: string | null = null;
    let userVenueId: string | null = null;

    if (isOrganizer && !hasAccess) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();
      
      if (organizer && organizer.id === event.organizer_id) {
        hasAccess = true;
        userOrganizerId = organizer.id;
      }
    }

    if (isVenueAdmin && !hasAccess) {
      const { data: venue } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("created_by", userId)
        .single();
      
      if (venue && venue.id === event.venue_id) {
        hasAccess = true;
        userVenueId = venue.id;
      }
    }

    if (isPromoter && !hasAccess) {
      const { data: promoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("created_by", userId)
        .single();
      
      if (promoter) {
        // Check if promoter is assigned to this event
        const { data: eventPromoter } = await serviceSupabase
          .from("event_promoters")
          .select("id")
          .eq("event_id", eventId)
          .eq("promoter_id", promoter.id)
          .single();
        
        if (eventPromoter) {
          hasAccess = true;
          userPromoterId = promoter.id;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query - include referral data
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        registered_at,
        referral_promoter_id,
        referred_by_user_id,
        attendee:attendees(
          id,
          name,
          surname,
          email,
          phone,
          gender
        ),
        checkins(id, checked_in_at, undo_at)
      `)
      .eq("event_id", eventId)
      .order("registered_at", { ascending: false });

    if (error) {
      console.error("[EventAttendees] Query error:", error);
      throw error;
    }

    // Get promoter names for referrals
    const promoterIds = [...new Set(registrations?.filter(r => r.referral_promoter_id).map(r => r.referral_promoter_id) || [])];
    const promoterMap = new Map<string, string>();
    
    if (promoterIds.length > 0) {
      const { data: promoters } = await serviceSupabase
        .from("promoters")
        .select("id, name")
        .in("id", promoterIds);
      
      promoters?.forEach(p => promoterMap.set(p.id, p.name));
    }

    // Get user names for user referrals
    const userReferrerIds = [...new Set(registrations?.filter(r => r.referred_by_user_id && !r.referral_promoter_id).map(r => r.referred_by_user_id) || [])];
    const userReferrerMap = new Map<string, string>();
    
    if (userReferrerIds.length > 0) {
      const { data: attendees } = await serviceSupabase
        .from("attendees")
        .select("user_id, name")
        .in("user_id", userReferrerIds);
      
      attendees?.forEach(a => {
        if (a.user_id) userReferrerMap.set(a.user_id, a.name);
      });
    }

    // Format results with source tracking
    let attendees: AttendeeWithSource[] = (registrations || []).map((reg: any) => {
      const checkin = reg.checkins && reg.checkins.length > 0 ? reg.checkins[0] : null;
      const isCheckedIn = checkin && !checkin.undo_at;
      
      // Determine referral source
      let referralSource: ReferralSource = "direct";
      if (reg.referral_promoter_id) {
        referralSource = "promoter";
      } else if (reg.referred_by_user_id) {
        referralSource = "user_referral";
      }
      // Note: venue/organizer attribution could be added based on registration context
      
      return {
        id: reg.id,
        attendee_id: reg.attendee_id,
        name: `${reg.attendee?.name || "Unknown"}${reg.attendee?.surname ? ` ${reg.attendee.surname}` : ""}`,
        email: reg.attendee?.email || null,
        phone: reg.attendee?.phone || null,
        gender: reg.attendee?.gender || null,
        registration_date: reg.registered_at,
        checked_in: isCheckedIn,
        check_in_time: isCheckedIn ? checkin.checked_in_at : null,
        referral_source: referralSource,
        promoter_id: reg.referral_promoter_id || null,
        promoter_name: reg.referral_promoter_id ? promoterMap.get(reg.referral_promoter_id) || "Unknown Promoter" : null,
        referred_by_user_id: reg.referred_by_user_id || null,
        referred_by_user_name: reg.referred_by_user_id && !reg.referral_promoter_id 
          ? userReferrerMap.get(reg.referred_by_user_id) || "Unknown User" 
          : null,
      };
    });

    // For promoters, filter to only their referrals
    if (isPromoter && userPromoterId && !isSuperadmin && !isVenueAdmin && !isOrganizer) {
      attendees = attendees.filter(a => a.promoter_id === userPromoterId);
    }

    // Apply source filter if provided
    if (source) {
      attendees = attendees.filter(a => a.referral_source === source);
    }

    // Apply promoter filter if provided
    if (promoterId) {
      attendees = attendees.filter(a => a.promoter_id === promoterId);
    }

    // Apply status filter if provided
    if (status === "checked_in") {
      attendees = attendees.filter(a => a.checked_in);
    } else if (status === "not_checked_in") {
      attendees = attendees.filter(a => !a.checked_in);
    }

    // Get list of promoters for filter dropdown
    const promotersList = [...promoterMap.entries()].map(([id, name]) => ({ id, name }));

    // Calculate summary stats
    const totalRegistered = attendees.length;
    const totalCheckedIn = attendees.filter(a => a.checked_in).length;
    const sourceBreakdown = {
      direct: attendees.filter(a => a.referral_source === "direct").length,
      promoter: attendees.filter(a => a.referral_source === "promoter").length,
      user_referral: attendees.filter(a => a.referral_source === "user_referral").length,
    };

    return NextResponse.json({ 
      attendees,
      promoters: promotersList,
      stats: {
        total: totalRegistered,
        checked_in: totalCheckedIn,
        not_checked_in: totalRegistered - totalCheckedIn,
        by_source: sourceBreakdown,
      },
      // Include user context for UI to know what to show
      userContext: {
        isPromoter: isPromoter && userPromoterId && !isSuperadmin && !isVenueAdmin && !isOrganizer,
        promoterId: userPromoterId,
      }
    });
  } catch (error: any) {
    console.error("[EventAttendees] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}

