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

  if (roles.includes("venue_admin")) {
    creatorRole = "venue_admin";
  } else if (roles.includes("promoter")) {
    creatorRole = "promoter";
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
    .select("*")
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

      return {
        ...code,
        owner_name: ownerName,
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

