import { NextRequest, NextResponse } from "next/server";
import { deleteInviteQRCode } from "@/lib/data/invite-codes";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; inviteQRCodeId: string } }
) {
  try {
    await deleteInviteQRCode(params.inviteQRCodeId, params.eventId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete invite QR code" },
      { status: error.message?.includes("Unauthorized") || error.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}

