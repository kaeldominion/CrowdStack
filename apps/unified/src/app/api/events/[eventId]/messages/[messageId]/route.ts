import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * PATCH /api/events/[eventId]/messages/[messageId]
 * Update a message (only the author can update)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; messageId: string } }
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
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the message belongs to this user
    const { data: existingMessage } = await serviceSupabase
      .from("event_message_board")
      .select("author_id")
      .eq("id", params.messageId)
      .eq("event_id", params.eventId)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMessage.author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update message
    const { data: updatedMessage, error } = await serviceSupabase
      .from("event_message_board")
      .update({
        message: message.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.messageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: updatedMessage });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update message" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/messages/[messageId]
 * Soft delete a message (only the author can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; messageId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify the message belongs to this user
    const { data: existingMessage } = await serviceSupabase
      .from("event_message_board")
      .select("author_id")
      .eq("id", params.messageId)
      .eq("event_id", params.eventId)
      .single();

    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (existingMessage.author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete message
    const { error } = await serviceSupabase
      .from("event_message_board")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", params.messageId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete message" },
      { status: 500 }
    );
  }
}

