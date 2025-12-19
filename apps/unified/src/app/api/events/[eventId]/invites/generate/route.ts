import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createInviteQRCode } from "@/lib/data/invite-codes";

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { max_uses, expires_at } = body;

    const inviteQR = await createInviteQRCode(params.eventId, {
      max_uses,
      expires_at,
    });

    return NextResponse.json({ invite_qr: inviteQR });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate invite QR code" },
      { status: 500 }
    );
  }
}

