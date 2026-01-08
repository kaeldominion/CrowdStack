import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import crypto from "crypto";
import { trackReferralClick } from "@/lib/analytics/server";

// Helper to create anonymous visitor fingerprint
function createVisitorFingerprint(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  
  // Create hash of IP + User Agent (no PII stored)
  const hash = crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}`)
    .digest("hex")
    .substring(0, 16);
  
  return hash;
}


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, referrerUserId } = body;

    if (!eventId || !referrerUserId) {
      return NextResponse.json(
        { error: "eventId and referrerUserId are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Verify referrer user exists and get promoter ID if applicable
    const { data: referrer, error: userError } = await supabase.auth.admin.getUserById(referrerUserId);
    
    if (userError || !referrer) {
      return NextResponse.json(
        { error: "Referrer user not found" },
        { status: 404 }
      );
    }

    // Get promoter ID if the referrer is a promoter
    let promoterId: string | undefined;
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id")
      .eq("created_by", referrerUserId)
      .single();
    
    if (promoter) {
      promoterId = promoter.id;
    }

    // Create visitor fingerprint
    const visitorFingerprint = createVisitorFingerprint(request);

    // Record the click
    const { data: click, error: clickError } = await supabase
      .from("referral_clicks")
      .insert({
        event_id: eventId,
        referrer_user_id: referrerUserId,
        visitor_fingerprint: visitorFingerprint,
      })
      .select()
      .single();

    if (clickError) {
      console.error("[Track Click] Error:", clickError);
      return NextResponse.json(
        { error: "Failed to track click" },
        { status: 500 }
      );
    }

    // Award XP for the referral click (small reward to encourage sharing)
    try {
      const { error: xpError } = await supabase.rpc('award_referral_click_xp', {
        p_referrer_user_id: referrerUserId,
        p_event_id: eventId,
        p_click_id: click.id,
      });
      
      if (xpError) {
        console.warn("[Track Click] Failed to award XP (non-critical):", xpError);
        // Don't fail the request if XP award fails
      }
    } catch (xpErr) {
      console.warn("[Track Click] XP award error (non-critical):", xpErr);
      // Don't fail the request if XP award fails
    }

    // Track analytics event
    try {
      if (promoterId) {
        await trackReferralClick(eventId, promoterId, referrerUserId, request);
      }
    } catch (analyticsError) {
      console.warn("[Track Click] Failed to track analytics event:", analyticsError);
    }

    return NextResponse.json({ 
      success: true, 
      clickId: click.id 
    });
  } catch (error: any) {
    console.error("[Track Click] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track click" },
      { status: 500 }
    );
  }
}

