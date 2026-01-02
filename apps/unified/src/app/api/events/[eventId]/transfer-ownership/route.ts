import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { isEventOwner } from "@crowdstack/shared/auth/event-permissions";

/**
 * POST /api/events/[eventId]/transfer-ownership
 * Transfer event ownership to another user
 * Only the current owner, superadmin, or admin can transfer ownership
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } | Promise<{ eventId: string }> }
) {
  try {
    // Handle params as Promise (Next.js 15+) or direct object
    const resolvedParams = await Promise.resolve(params);
    const eventId = resolvedParams.eventId;

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

    const serviceSupabase = createServiceRoleClient();
    
    // Check if user is admin or superadmin
    const { data: roles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roleList = roles?.map((r: { role: string }) => r.role) || [];
    const isSuperadmin = roleList.includes("superadmin");
    const isAdmin = roleList.includes("admin");

    // Check if current user can transfer ownership (owner, superadmin, or admin)
    const canTransfer = await isEventOwner(userId, eventId) || isSuperadmin || isAdmin;
    if (!canTransfer) {
      return NextResponse.json(
        { error: "Only the event owner, superadmin, or admin can transfer ownership" },
        { status: 403 }
      );
    }

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
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("name, owner_user_id")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error("[transfer-ownership] Event query error:", eventError);
      console.error("[transfer-ownership] EventId:", eventId);
      return NextResponse.json(
        { error: `Event not found: ${eventError.message}` },
        { status: 404 }
      );
    }

    if (!event) {
      console.error("[transfer-ownership] Event not found, eventId:", eventId);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transfer ownership
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({ owner_user_id: new_owner_user_id })
      .eq("id", eventId);

    if (updateError) {
      throw updateError;
    }

    // Log the transfer in audit_logs
    await serviceSupabase.from("audit_logs").insert({
      user_id: userId,
      action_type: "ownership_transfer",
      resource_type: "event",
      resource_id: eventId,
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

