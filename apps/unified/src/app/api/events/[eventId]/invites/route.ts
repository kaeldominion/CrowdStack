import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getEventInviteQRCodes } from "@/lib/data/invite-codes";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
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

    const inviteQRCodes = await getEventInviteQRCodes(params.eventId);

    return NextResponse.json({ invite_qr_codes: inviteQRCodes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch invite QR codes" },
      { status: 500 }
    );
  }
}

