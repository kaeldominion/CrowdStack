import "server-only";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { randomBytes } from "crypto";

export interface InviteQRCode {
  id: string;
  event_id: string;
  created_by: string;
  creator_role: "venue_admin" | "event_organizer" | "promoter";
  qr_token: string;
  invite_code: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
  owner_name?: string; // Name of the owner (organizer, venue, or promoter)
  promoter_id?: string | null; // Optional: specific promoter this code is for (when organizer creates code for a promoter)
  self_promote?: boolean | null; // Optional: if true, this is a self-promote QR code for the organizer
}

/**
 * Generate a unique invite code string
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
  let code = "INV-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new invite QR code for an event
 */
export async function createInviteQRCode(
  eventId: string,
  options: {
    max_uses?: number;
    expires_at?: string;
    promoter_id?: string; // Optional: if organizer wants to create code for specific promoter
    self_promote?: boolean; // Optional: if true, this is a self-promote QR code for the organizer
  } = {}
): Promise<InviteQRCode> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Determine creator role
  const { getUserRoles } = await import("@crowdstack/shared/auth/roles");
  const roles = await getUserRoles();
  let creatorRole: "venue_admin" | "event_organizer" | "promoter" = "event_organizer";

  // If promoter_id is specified, the creator is still the organizer/venue, but the code is for that promoter
  let finalPromoterId: string | null = options.promoter_id || null;
  
  if (roles.includes("venue_admin")) {
    creatorRole = "venue_admin";
  } else if (roles.includes("promoter") && !finalPromoterId) {
    // If user is a promoter and no specific promoter_id was provided, use their promoter profile
    creatorRole = "promoter";
    const { data: promoter } = await serviceSupabase
      .from("promoters")
      .select("id")
      .eq("created_by", user.id)
      .single();
    if (promoter) {
      finalPromoterId = promoter.id;
    }
  }

  // Generate unique invite code and token
  let inviteCode: string;
  let qrToken: string;
  let isUnique = false;

  while (!isUnique) {
    inviteCode = generateInviteCode();
    // Generate a unique token for the invite QR code
    qrToken = `inv_${randomBytes(32).toString("hex")}`;

    // Check if code already exists
    const { data: existing } = await serviceSupabase
      .from("invite_qr_codes")
      .select("id")
      .or(`invite_code.eq.${inviteCode},qr_token.eq.${qrToken}`)
      .single();

    if (!existing) {
      isUnique = true;
    }
  }

  // Create invite QR code record
  const { data: inviteQR, error } = await serviceSupabase
    .from("invite_qr_codes")
    .insert({
      event_id: eventId,
      created_by: user.id,
      creator_role: creatorRole,
      qr_token: qrToken!,
      invite_code: inviteCode!,
      max_uses: options.max_uses || null,
      expires_at: options.expires_at || null,
      used_count: 0,
      promoter_id: finalPromoterId || null,
      self_promote: options.self_promote || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return inviteQR;
}

/**
 * Get all invite QR codes for an event
 */
export async function getEventInviteQRCodes(eventId: string): Promise<InviteQRCode[]> {
  const supabase = createServiceRoleClient();

  const { data: inviteCodes, error } = await supabase
    .from("invite_qr_codes")
    .select("*, promoter:promoters(id, name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!inviteCodes || inviteCodes.length === 0) {
    return [];
  }

  // Enrich invite codes with owner names based on creator_role and created_by
  const enrichedCodes = await Promise.all(
    inviteCodes.map(async (code) => {
      let ownerName: string | undefined;

      if (code.creator_role === "event_organizer") {
        // Get organizer name by created_by user_id
        const { data: organizer } = await supabase
          .from("organizers")
          .select("name")
          .eq("created_by", code.created_by)
          .single();
        ownerName = organizer?.name;
      } else if (code.creator_role === "venue_admin") {
        // Get venue name by created_by user_id
        const { data: venue } = await supabase
          .from("venues")
          .select("name")
          .eq("created_by", code.created_by)
          .single();
        ownerName = venue?.name;
      } else if (code.creator_role === "promoter") {
        // Get promoter name by created_by user_id
        const { data: promoter } = await supabase
          .from("promoters")
          .select("name")
          .eq("created_by", code.created_by)
          .single();
        ownerName = promoter?.name;
      }

      // If promoter_id is set (organizer created code for specific promoter), use that promoter's name
      if (code.promoter_id) {
        const promoter = Array.isArray(code.promoter) ? code.promoter[0] : code.promoter;
        if (promoter?.name) {
          ownerName = promoter.name;
        } else {
          // Fallback: query promoter directly if join didn't work
          const { data: promoterData } = await supabase
            .from("promoters")
            .select("name")
            .eq("id", code.promoter_id)
            .single();
          if (promoterData?.name) {
            ownerName = promoterData.name;
          }
        }
      }

      return {
        ...code,
        owner_name: ownerName,
        promoter_id: code.promoter_id || undefined,
      };
    })
  );

  return enrichedCodes;
}

/**
 * Validate and use an invite code
 */
export async function useInviteCode(
  inviteCode: string,
  registrationId: string
): Promise<{ valid: boolean; message?: string }> {
  const supabase = createServiceRoleClient();

  const { data: inviteQR } = await supabase
    .from("invite_qr_codes")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (!inviteQR) {
    return { valid: false, message: "Invalid invite code" };
  }

  // Check expiration
  if (inviteQR.expires_at && new Date(inviteQR.expires_at) < new Date()) {
    return { valid: false, message: "Invite code has expired" };
  }

  // Check max uses
  if (inviteQR.max_uses && inviteQR.used_count >= inviteQR.max_uses) {
    return { valid: false, message: "Invite code has reached maximum uses" };
  }

  // Increment used count
  await supabase
    .from("invite_qr_codes")
    .update({ used_count: inviteQR.used_count + 1 })
    .eq("id", inviteQR.id);

  // Link the registration to the invite code creator (if needed)
  // This would require updating the registrations table or storing this in metadata

  return { valid: true };
}

/**
 * Get invite code details by code string
 */
export async function getInviteCodeDetails(inviteCode: string): Promise<InviteQRCode | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("invite_qr_codes")
    .select(`
      *,
      event:events(
        id,
        name,
        slug,
        start_time
      )
    `)
    .eq("invite_code", inviteCode)
    .single();

  if (error || !data) {
    return null;
  }

  return data as any;
}

/**
 * Delete an invite QR code
 */
export async function deleteInviteQRCode(
  inviteQRCodeId: string,
  eventId: string
): Promise<void> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify the invite QR code belongs to the event
  const { data: inviteQR, error: fetchError } = await serviceSupabase
    .from("invite_qr_codes")
    .select("event_id, created_by")
    .eq("id", inviteQRCodeId)
    .single();

  if (fetchError || !inviteQR) {
    throw new Error("Invite QR code not found");
  }

  if (inviteQR.event_id !== eventId) {
    throw new Error("Invite QR code does not belong to this event");
  }

  // Check if user has permission (creator, organizer, venue admin, or superadmin)
  const { getUserRoles } = await import("@crowdstack/shared/auth/roles");
  const roles = await getUserRoles();
  const isSuperadmin = roles.includes("superadmin");
  const isCreator = inviteQR.created_by === user.id;

  // Check if user is the event organizer or venue admin
  let hasEventAccess = false;
  if (!isCreator && !isSuperadmin) {
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id, venue:venues(created_by)")
      .eq("id", eventId)
      .single();

    if (event) {
      // Check if user is organizer
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("created_by")
        .eq("id", event.organizer_id)
        .single();
      
      if (organizer?.created_by === user.id) {
        hasEventAccess = true;
      }

      // Check if user is venue admin
      if (!hasEventAccess && event.venue_id) {
        const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
        if (venue?.created_by === user.id) {
          hasEventAccess = true;
        }

        // Check venue users
        if (!hasEventAccess) {
          const { data: venueUser } = await serviceSupabase
            .from("venue_users")
            .select("id")
            .eq("venue_id", event.venue_id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (venueUser) {
            hasEventAccess = true;
          }
        }
      }
    }
  }

  if (!isCreator && !isSuperadmin && !hasEventAccess) {
    throw new Error("Forbidden: You do not have permission to delete this invite QR code");
  }

  // Delete the invite QR code
  const { error: deleteError } = await serviceSupabase
    .from("invite_qr_codes")
    .delete()
    .eq("id", inviteQRCodeId);

  if (deleteError) {
    throw deleteError;
  }
}

