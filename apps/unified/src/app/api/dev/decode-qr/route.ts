import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.QR_JWT_SECRET || process.env.JWT_SECRET || "crowdstack-dev-jwt-secret-do-not-use-in-production";

interface DecodedQR {
  type: "pass" | "registration_url" | "invite_code" | "unknown";
  raw: string;
  decoded?: {
    registration_id?: string;
    event_id?: string;
    attendee_id?: string;
    exp?: number;
    iat?: number;
  };
  attendee?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  event?: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time?: string;
    venue?: {
      id: string;
      name: string;
    };
  };
  registration?: {
    id: string;
    status: string;
    registered_at?: string;
    checked_in?: boolean;
  };
  referrer?: {
    type: "promoter" | "user" | "venue" | "organizer" | null;
    id?: string;
    name?: string;
    code?: string;
  };
  error?: string;
}

/**
 * POST /api/dev/decode-qr
 * Decodes a QR code (JWT token, URL, or invite code) and returns full details
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const result: DecodedQR = {
      type: "unknown",
      raw: code,
    };

    const serviceSupabase = createServiceRoleClient();

    // Try to detect the type of QR code
    if (code.startsWith("http") || code.startsWith("/")) {
      // It's a URL - parse it for referral info
      result.type = "registration_url";
      
      try {
        const url = new URL(code.startsWith("/") ? `https://example.com${code}` : code);
        const ref = url.searchParams.get("ref");
        const invite = url.searchParams.get("invite");
        
        // Extract event slug from URL path
        const pathMatch = url.pathname.match(/\/e\/([^\/]+)/);
        const eventSlug = pathMatch ? pathMatch[1] : null;
        
        if (eventSlug) {
          // Look up event by slug
          const { data: event } = await serviceSupabase
            .from("events")
            .select(`
              id, name, slug, start_time, end_time,
              venue:venues(id, name)
            `)
            .eq("slug", eventSlug)
            .single();
          
          if (event) {
            result.event = {
              id: event.id,
              name: event.name,
              slug: event.slug,
              start_time: event.start_time,
              end_time: event.end_time || undefined,
              venue: event.venue ? {
                id: (event.venue as any).id,
                name: (event.venue as any).name,
              } : undefined,
            };
          }
        }
        
        // Parse referrer from ref parameter
        if (ref) {
          result.referrer = await parseReferrer(ref, serviceSupabase);
        } else if (invite) {
          // Look up invite code
          const { data: inviteCode } = await serviceSupabase
            .from("invite_codes")
            .select(`
              id, code, promoter_id, organizer_id,
              promoter:promoters(id, name)
            `)
            .eq("code", invite)
            .single();
          
          if (inviteCode) {
            result.referrer = {
              type: "promoter",
              id: inviteCode.promoter_id || undefined,
              name: (inviteCode.promoter as any)?.name || undefined,
              code: inviteCode.code,
            };
          }
        }
      } catch (urlError) {
        result.error = "Failed to parse URL";
      }
    } else if (code.includes(".") && code.split(".").length === 3) {
      // Looks like a JWT token
      result.type = "pass";
      
      try {
        // First try to decode without verification to see the payload
        const decoded = jwt.decode(code) as any;
        
        if (decoded) {
          result.decoded = {
            registration_id: decoded.registration_id,
            event_id: decoded.event_id,
            attendee_id: decoded.attendee_id,
            exp: decoded.exp,
            iat: decoded.iat,
          };
          
          // Try to verify (will add error if invalid/expired but still show decoded data)
          try {
            jwt.verify(code, JWT_SECRET);
          } catch (verifyError: any) {
            if (verifyError.name === "TokenExpiredError") {
              result.error = "Token has expired";
            } else if (verifyError.name === "JsonWebTokenError") {
              result.error = `Invalid token: ${verifyError.message}`;
            }
          }
          
          // Look up registration details
          if (decoded.registration_id) {
            const { data: registration } = await serviceSupabase
              .from("registrations")
              .select(`
                id,
                status,
                registered_at,
                referral_promoter_id,
                referred_by_user_id,
                attendee:attendees(id, name, surname, email, phone),
                event:events(
                  id, name, slug, start_time, end_time,
                  venue:venues(id, name)
                )
              `)
              .eq("id", decoded.registration_id)
              .single();
            
            if (registration) {
              const attendee = registration.attendee as any;
              const event = registration.event as any;
              
              result.attendee = {
                id: attendee?.id,
                name: [attendee?.name, attendee?.surname].filter(Boolean).join(" ") || attendee?.email?.split("@")[0] || "Guest",
                email: attendee?.email,
                phone: attendee?.phone,
              };
              
              result.event = {
                id: event?.id,
                name: event?.name,
                slug: event?.slug,
                start_time: event?.start_time,
                end_time: event?.end_time,
                venue: event?.venue ? {
                  id: event.venue.id,
                  name: event.venue.name,
                } : undefined,
              };
              
              result.registration = {
                id: registration.id,
                status: registration.status,
                registered_at: registration.registered_at,
              };
              
              // Check if checked in
              const { data: checkin } = await serviceSupabase
                .from("checkins")
                .select("id, checked_in_at")
                .eq("registration_id", registration.id)
                .is("undo_at", null)
                .maybeSingle();
              
              if (checkin) {
                result.registration.checked_in = true;
              }
              
              // Get referrer info
              if (registration.referral_promoter_id) {
                const { data: promoter } = await serviceSupabase
                  .from("promoters")
                  .select("id, name")
                  .eq("id", registration.referral_promoter_id)
                  .single();
                
                if (promoter) {
                  result.referrer = {
                    type: "promoter",
                    id: promoter.id,
                    name: promoter.name,
                  };
                }
              } else if (registration.referred_by_user_id) {
                const { data: referrer } = await serviceSupabase
                  .from("attendees")
                  .select("id, name, email")
                  .eq("user_id", registration.referred_by_user_id)
                  .maybeSingle();
                
                if (referrer) {
                  result.referrer = {
                    type: "user",
                    id: referrer.id,
                    name: referrer.name || referrer.email?.split("@")[0],
                  };
                }
              }
            }
          }
        }
      } catch (jwtError: any) {
        result.error = `Failed to decode token: ${jwtError.message}`;
      }
    } else {
      // Might be a short invite code
      result.type = "invite_code";
      
      const { data: inviteCode } = await serviceSupabase
        .from("invite_codes")
        .select(`
          id, code, event_id, promoter_id,
          promoter:promoters(id, name),
          event:events(id, name, slug, start_time, venue:venues(id, name))
        `)
        .eq("code", code)
        .single();
      
      if (inviteCode) {
        const event = inviteCode.event as any;
        const promoter = inviteCode.promoter as any;
        
        if (event) {
          result.event = {
            id: event.id,
            name: event.name,
            slug: event.slug,
            start_time: event.start_time,
            venue: event.venue ? {
              id: event.venue.id,
              name: event.venue.name,
            } : undefined,
          };
        }
        
        result.referrer = {
          type: "promoter",
          id: inviteCode.promoter_id || undefined,
          name: promoter?.name,
          code: inviteCode.code,
        };
      } else {
        result.type = "unknown";
        result.error = "Could not identify QR code type";
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Decode QR API] Error:", error);
    return NextResponse.json(
      { 
        type: "unknown",
        raw: "",
        error: error.message || "Failed to decode QR code" 
      },
      { status: 500 }
    );
  }
}

// Helper to parse ref parameter
async function parseReferrer(ref: string, supabase: any) {
  // Check for UUID format (could be a direct promoter ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Handle user_ prefix (user referrals - for organizers/team members)
  if (ref.startsWith("user_")) {
    const userId = ref.substring(5); // Remove "user_" prefix
    
    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (user && !userError) {
      // Check if user has a promoter profile
      const { data: promoter } = await supabase
        .from("promoters")
        .select("id, name")
        .eq("created_by", userId)
        .maybeSingle();
      
      // Check if user has an attendee record
      const { data: attendee } = await supabase
        .from("attendees")
        .select("id, name, email")
        .eq("user_id", userId)
        .maybeSingle();
      
      return {
        type: "user" as const,
        id: userId,
        name: promoter?.name || attendee?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Unknown User",
      };
    }
    
    return { type: "user" as const, id: userId, name: undefined };
  }
  
  // Handle org_ prefix (organizer shares)
  if (ref.startsWith("org_")) {
    const organizerId = ref.substring(4);
    const { data: organizer } = await supabase
      .from("organizers")
      .select("id, name, created_by")
      .eq("id", organizerId)
      .single();
    
    if (organizer) {
      // Also try to find organizer's promoter profile
      let promoterName = organizer.name;
      if (organizer.created_by) {
        const { data: promoter } = await supabase
          .from("promoters")
          .select("id, name")
          .eq("created_by", organizer.created_by)
          .maybeSingle();
        if (promoter) {
          promoterName = promoter.name || organizer.name;
        }
      }
      return {
        type: "organizer" as const,
        id: organizerId,
        name: promoterName,
      };
    }
    return { type: "organizer" as const, id: organizerId, name: undefined };
  }
  
  // If it's a raw UUID, try promoter first, then user
  if (uuidRegex.test(ref)) {
    // Try as promoter ID first
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id, name")
      .eq("id", ref)
      .maybeSingle();
    
    if (promoter) {
      return {
        type: "promoter" as const,
        id: ref,
        name: promoter.name,
      };
    }
    
    // Try as user ID
    const { data: attendee } = await supabase
      .from("attendees")
      .select("id, name, email")
      .eq("user_id", ref)
      .maybeSingle();
    
    if (attendee) {
      return {
        type: "user" as const,
        id: ref,
        name: attendee.name || attendee.email?.split("@")[0],
      };
    }
    
    return { type: null, id: ref, name: undefined };
  }
  
  // Handle prefixed refs
  const parts = ref.split("_");
  const type = parts[0];
  const id = parts.slice(1).join("_");

  switch (type) {
    case "promoter": {
      const { data: promoter } = await supabase
        .from("promoters")
        .select("id, name")
        .eq("id", id)
        .single();
      return {
        type: "promoter" as const,
        id,
        name: promoter?.name,
      };
    }
    case "venue": {
      const { data: venue } = await supabase
        .from("venues")
        .select("id, name")
        .eq("id", id)
        .single();
      return {
        type: "venue" as const,
        id,
        name: venue?.name,
      };
    }
    case "user": {
      const { data: attendee } = await supabase
        .from("attendees")
        .select("id, name, email")
        .eq("user_id", id)
        .maybeSingle();
      return {
        type: "user" as const,
        id,
        name: attendee?.name || attendee?.email?.split("@")[0],
      };
    }
    case "organizer": {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("id, name")
        .eq("id", id)
        .single();
      return {
        type: "organizer" as const,
        id,
        name: organizer?.name,
      };
    }
    default:
      // Unknown format
      return {
        type: null,
        code: ref,
      };
  }
}

