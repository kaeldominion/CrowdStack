import "server-only";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export interface GuestFlag {
  id: string;
  attendee_id: string;
  venue_id: string;
  reason: string;
  strike_count: number;
  ban_type: "temporary" | "permanent";
  permanent_ban: boolean;
  expires_at: string | null;
  flagged_by: string | null;
  created_at: string;
}

export interface FlagAttendeeRequest {
  attendee_id: string;
  venue_id: string;
  reason: string;
  strike_count?: number;
  permanent_ban?: boolean;
  expires_at?: string;
}

/**
 * Flag an attendee at a venue
 */
export async function flagAttendee(request: FlagAttendeeRequest): Promise<GuestFlag> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Check existing flag
  const { data: existingFlag } = await serviceSupabase
    .from("guest_flags")
    .select("*")
    .eq("attendee_id", request.attendee_id)
    .eq("venue_id", request.venue_id)
    .single();

  let strikeCount = request.strike_count || 1;
  let permanentBan = request.permanent_ban || false;

  if (existingFlag) {
    // Increment strikes
    strikeCount = (existingFlag.strike_count || 0) + (request.strike_count || 1);

    // Auto-ban at 3 strikes
    if (strikeCount >= 3 && !request.permanent_ban) {
      permanentBan = true;
    }

    // Update existing flag
    const { data: updatedFlag, error } = await serviceSupabase
      .from("guest_flags")
      .update({
        reason: request.reason,
        strike_count: strikeCount,
        ban_type: permanentBan ? "permanent" : "temporary",
        permanent_ban: permanentBan,
        expires_at: request.expires_at || null,
        flagged_by: user.id,
      })
      .eq("id", existingFlag.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedFlag;
  } else {
    // Create new flag
    // Auto-ban at 3 strikes
    if (strikeCount >= 3 && !request.permanent_ban) {
      permanentBan = true;
    }

    const { data: newFlag, error } = await serviceSupabase
      .from("guest_flags")
      .insert({
        attendee_id: request.attendee_id,
        venue_id: request.venue_id,
        reason: request.reason,
        strike_count: strikeCount,
        ban_type: permanentBan ? "permanent" : "temporary",
        permanent_ban: permanentBan,
        expires_at: request.expires_at || null,
        flagged_by: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return newFlag;
  }
}

/**
 * Remove a flag (unflag an attendee)
 */
export async function unflagAttendee(attendeeId: string, venueId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("guest_flags")
    .delete()
    .eq("attendee_id", attendeeId)
    .eq("venue_id", venueId);

  if (error) {
    throw error;
  }
}

/**
 * Get all flags for a venue
 */
export async function getVenueFlags(venueId: string): Promise<GuestFlag[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("guest_flags")
    .select(`
      *,
      attendee:attendees(id, name, email, phone)
    `)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as any;
}

/**
 * Get flag for a specific attendee at a venue
 */
export async function getAttendeeFlag(
  attendeeId: string,
  venueId: string
): Promise<GuestFlag | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("guest_flags")
    .select("*")
    .eq("attendee_id", attendeeId)
    .eq("venue_id", venueId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if an attendee is banned at a venue
 */
export async function isAttendeeBanned(attendeeId: string, venueId: string): Promise<boolean> {
  const flag = await getAttendeeFlag(attendeeId, venueId);

  if (!flag) {
    return false;
  }

  // Check if permanent ban
  if (flag.permanent_ban) {
    return true;
  }

  // Check if temporary ban is still active
  if (flag.expires_at && new Date(flag.expires_at) > new Date()) {
    return true;
  }

  // Check if 3+ strikes (auto-ban)
  if ((flag.strike_count || 0) >= 3) {
    return true;
  }

  return false;
}

