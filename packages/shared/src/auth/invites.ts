import "server-only";

import { createServiceRoleClient } from "../supabase/server";
import type { UserRole, InviteToken } from "../types";
import { randomBytes } from "crypto";

/**
 * Generate a secure invite token
 */
export function generateInviteToken(): string {
  return `invite-${randomBytes(32).toString("hex")}`;
}

/**
 * Create an invite token in the database
 */
export async function createInviteToken(
  role: UserRole,
  metadata: Record<string, any> = {},
  createdBy: string | null = null
): Promise<string> {
  const supabase = createServiceRoleClient();
  const token = generateInviteToken();

  const { data, error } = await supabase
    .from("invite_tokens")
    .insert({
      token,
      role,
      metadata,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create invite token: ${error?.message}`);
  }

  return token;
}

/**
 * Validate and get invite token details
 */
export async function getInviteToken(
  token: string
): Promise<InviteToken | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data as InviteToken;
}

/**
 * Check if an invite token is valid (not used, not expired)
 */
export function isInviteTokenValid(token: InviteToken): boolean {
  // Check if already used
  if (token.used_at) {
    return false;
  }

  // Check if expired (if expires_at is set)
  if (token.expires_at) {
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    if (now > expiresAt) {
      return false;
    }
  }

  return true;
}

/**
 * Mark an invite token as used
 */
export async function markInviteTokenUsed(token: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  if (error) {
    throw new Error(`Failed to mark token as used: ${error.message}`);
  }
}

/**
 * Accept an invite token and assign role to user
 * Also links user to entity (venue/organizer) if specified in metadata
 */
export async function acceptInviteToken(
  token: string,
  userId: string
): Promise<{ role: UserRole; metadata: Record<string, any> }> {
  const inviteToken = await getInviteToken(token);

  if (!inviteToken) {
    throw new Error("Invalid invite token");
  }

  if (!isInviteTokenValid(inviteToken)) {
    throw new Error("Invite token is already used or expired");
  }

  const supabase = createServiceRoleClient();

  // Assign role to user
  const { assignUserRole } = await import("./roles");
  await assignUserRole(userId, inviteToken.role, inviteToken.metadata);

  // Link user to entity if specified in metadata
  if (inviteToken.metadata) {
    // Link to venue if venue_id is in metadata
    if (inviteToken.metadata.venue_id && inviteToken.role === "venue_admin") {
      const { error: venueError } = await supabase
        .from("venue_users")
        .upsert({
          venue_id: inviteToken.metadata.venue_id,
          user_id: userId,
          role: "admin",
          assigned_by: inviteToken.created_by,
        }, {
          onConflict: "venue_id,user_id"
        });

      if (venueError) {
        console.error("Failed to link user to venue:", venueError);
        throw new Error(`Failed to link user to venue: ${venueError.message}`);
      }
    }

    // Link to organizer if organizer_id is in metadata
    if (inviteToken.metadata.organizer_id && inviteToken.role === "event_organizer") {
      // Check if user already has an organizer assignment (shouldn't happen due to constraint, but check anyway)
      const { data: existing } = await supabase
        .from("organizer_users")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        // User already assigned to an organizer - update it
        const { error: organizerError } = await supabase
          .from("organizer_users")
          .update({
            organizer_id: inviteToken.metadata.organizer_id,
            assigned_by: inviteToken.created_by,
            assigned_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (organizerError) {
          console.error("Failed to update user organizer assignment:", organizerError);
          throw new Error(`Failed to link user to organizer: ${organizerError.message}`);
        }
      } else {
        // New assignment
        const { error: organizerError } = await supabase
          .from("organizer_users")
          .insert({
            organizer_id: inviteToken.metadata.organizer_id,
            user_id: userId,
            role: "admin",
            assigned_by: inviteToken.created_by,
          });

        if (organizerError) {
          console.error("Failed to link user to organizer:", organizerError);
          throw new Error(`Failed to link user to organizer: ${organizerError.message}`);
        }
      }
    }

    // For promoter invites, optionally pre-assign to event if specified
    if (inviteToken.role === "promoter" && inviteToken.metadata.pre_assign_event_id) {
      // First, get or create the promoter profile for this user
      // The user will have the promoter role now, but may not have a profile yet
      let promoterId: string | null = null;

      // Check if promoter profile exists
      const { data: existingPromoter } = await supabase
        .from("promoters")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingPromoter) {
        promoterId = existingPromoter.id;
      } else {
        // Create a basic promoter profile
        const { data: newPromoter, error: createError } = await supabase
          .from("promoters")
          .insert({
            user_id: userId,
            name: inviteToken.metadata.invitee_email || "Promoter",
            email: inviteToken.metadata.invitee_email || null,
            status: "active",
            created_by: inviteToken.created_by,
          })
          .select("id")
          .single();

        if (createError || !newPromoter) {
          console.error("Failed to create promoter profile:", createError);
          // Don't fail the invite acceptance - they can create profile later
        } else {
          promoterId = newPromoter.id;
        }
      }

      // If we have a promoter profile, assign to event
      if (promoterId) {
        const { error: assignError } = await supabase
          .from("event_promoters")
          .upsert({
            event_id: inviteToken.metadata.pre_assign_event_id,
            promoter_id: promoterId,
            commission_type: "flat_per_head",
            commission_config: { flat_per_head: 0 }, // Default, can be updated later
          }, {
            onConflict: "event_id,promoter_id"
          });

        if (assignError) {
          console.error("Failed to pre-assign promoter to event:", assignError);
          // Don't fail the invite acceptance - they can be assigned later
        }
      }
    }
  }

  // Mark token as used
  await markInviteTokenUsed(token);

  return {
    role: inviteToken.role,
    metadata: inviteToken.metadata,
  };
}

