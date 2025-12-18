import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    const { data: inviteQR, error } = await supabase
      .from("invite_qr_codes")
      .select(`
        *,
        event:events(
          id,
          name,
          slug,
          start_time,
          description
        )
      `)
      .eq("invite_code", params.code)
      .single();

    if (error || !inviteQR) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Check expiration
    if (inviteQR.expires_at && new Date(inviteQR.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
    }

    // Check max uses
    if (inviteQR.max_uses && inviteQR.used_count >= inviteQR.max_uses) {
      return NextResponse.json(
        { error: "Invite code has reached maximum uses" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      invite: inviteQR,
      event: inviteQR.event,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to validate invite code" },
      { status: 500 }
    );
  }
}

