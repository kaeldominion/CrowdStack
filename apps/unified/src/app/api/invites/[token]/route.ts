import { NextRequest, NextResponse } from "next/server";
import { getInviteToken } from "@crowdstack/shared/auth/invites";

/**
 * GET /api/invites/[token]
 * Get invite token details (for validation)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const inviteToken = await getInviteToken(params.token);

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    if (inviteToken.used_at) {
      return NextResponse.json(
        { error: "Invite token has already been used" },
        { status: 400 }
      );
    }

    // Return token info (without sensitive data)
    return NextResponse.json({
      valid: true,
      role: inviteToken.role,
      metadata: inviteToken.metadata,
    });
  } catch (error: any) {
    console.error("Failed to get invite token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate invite token" },
      { status: 500 }
    );
  }
}

