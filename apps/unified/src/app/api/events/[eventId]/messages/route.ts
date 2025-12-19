import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

/**
 * GET /api/events/[eventId]/messages
 * Get all messages for an event's message board
 */
export async function GET(
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

    const serviceSupabase = createServiceRoleClient();

    // Fetch messages for this event
    const { data: messages, error } = await serviceSupabase
      .from("event_message_board")
      .select("*")
      .eq("event_id", params.eventId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Map to match EventMessage interface
    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      event_id: msg.event_id,
      sender_id: msg.author_id,
      sender_name: msg.author_name,
      sender_email: msg.author_email,
      message: msg.message,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/messages
 * Create a new message on the message board
 */
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
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user email for denormalization
    const authorEmail = user.email || "";
    const authorName = user.user_metadata?.name || authorEmail.split("@")[0] || "User";

    // Insert message
    const { data: newMessage, error } = await serviceSupabase
      .from("event_message_board")
      .insert({
        event_id: params.eventId,
        author_id: user.id,
        author_email: authorEmail,
        author_name: authorName,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: newMessage });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create message" },
      { status: 500 }
    );
  }
}
