import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { isEventOwner } from "@crowdstack/shared/auth/event-permissions";

/**
 * POST /api/events/[eventId]/transfer-ownership
 * Transfer event ownership to another user
 * Only the current owner or superadmin can transfer ownership
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { new_owner_user_id } = body;

    if (!new_owner_user_id) {
      return NextResponse.json(
        { error: "new_owner_user_id is required" },
        { status: 400 }
      );
    }

    // Check if current user can transfer ownership
    const canTransfer = await isEventOwner(userId, params.eventId);
    if (!canTransfer) {
      return NextResponse.json(
        { error: "Only the event owner or superadmin can transfer ownership" },
        { status: 403 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the new owner exists
    const { data: newOwner, error: userError } = await serviceSupabase
      .from("auth.users")
      .select("id")
      .eq("id", new_owner_user_id)
      .single();

    // If we can't query auth.users directly, try to verify via user_roles or other means
    if (userError) {
      // Fallback: check if user has any role assigned
      const { data: userRole } = await serviceSupabase
        .from("user_roles")
        .select("id")
        .eq("user_id", new_owner_user_id)
        .limit(1)
        .single();

      if (!userRole) {
        return NextResponse.json(
          { error: "New owner user not found" },
          { status: 404 }
        );
      }
    }

    // Get current event details for audit
    const { data: event } = await serviceSupabase
      .from("events")
      .select("name, owner_user_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transfer ownership
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ owner_user_id: new_owner_user_id })
      .eq("id", params.eventId);

    if (updateError) {
      throw updateError;
    }

    // Log the transfer in audit_logs
    await serviceSupabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "ownership_transfer",
      resource_type: "event",
      resource_id: params.eventId,
      metadata: {
        event_name: event.name,
        previous_owner_id: event.owner_user_id,
        new_owner_id: new_owner_user_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Event ownership transferred successfully",
      new_owner_user_id,
    });
  } catch (error: any) {
    console.error("[transfer-ownership] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}

