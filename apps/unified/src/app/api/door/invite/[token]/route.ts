import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userId = user?.id;

  if (!userId) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = cookieStore.get(authCookieName);

    if (authCookie) {
      try {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        if (parsed.user?.id) {
          userId = parsed.user.id;
        }
      } catch (e) {}
    }
  }

  return userId || null;
}

/**
 * GET /api/door/invite/[token]
 * Get invite details
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    // Get invite with event details
    const { data: invite, error } = await supabase
      .from("door_staff_invites")
      .select(`
        id,
        email,
        expires_at,
        used_at,
        event:events(
          id,
          name,
          start_time,
          venue:venues(name)
        )
      `)
      .eq("token", params.token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    // Check if already used
    if (invite.used_at) {
      return NextResponse.json({ error: "Invite has already been used" }, { status: 410 });
    }

    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/door/invite/[token]
 * Accept an invite (user must be logged in)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Must be logged in to accept invite" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get and validate invite
    const { data: invite, error: inviteError } = await supabase
      .from("door_staff_invites")
      .select("id, event_id, email, expires_at, used_at")
      .eq("token", params.token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: "Invite has already been used" }, { status: 410 });
    }

    // Check if user already assigned to this event
    const { data: existing } = await supabase
      .from("event_door_staff")
      .select("id")
      .eq("event_id", invite.event_id)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Mark invite as used and return success
      await supabase
        .from("door_staff_invites")
        .update({ used_at: new Date().toISOString(), used_by: userId })
        .eq("id", invite.id);

      return NextResponse.json({
        success: true,
        message: "You already have access to this event",
        event_id: invite.event_id,
      });
    }

    // Create door staff assignment
    const { error: assignError } = await supabase
      .from("event_door_staff")
      .insert({
        event_id: invite.event_id,
        user_id: userId,
        assigned_by: userId, // Self-assigned via invite
        notes: "Joined via invite link",
      });

    if (assignError) {
      console.error("Error creating assignment:", assignError);
      return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
    }

    // Mark invite as used
    await supabase
      .from("door_staff_invites")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", invite.id);

    return NextResponse.json({
      success: true,
      message: "You now have door staff access to this event",
      event_id: invite.event_id,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}

