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

  // Assign role to user
  const { assignUserRole } = await import("./roles");
  await assignUserRole(userId, inviteToken.role, inviteToken.metadata);

  // Mark token as used
  await markInviteTokenUsed(token);

  return {
    role: inviteToken.role,
    metadata: inviteToken.metadata,
  };
}

