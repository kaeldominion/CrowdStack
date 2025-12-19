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
    // If avatar_url is not stored, try to get it from auth.users metadata
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

    // Get avatar URLs from auth.users for messages that don't have one stored
    const messagesWithAvatars = await Promise.all(
      (messages || []).map(async (msg: any) => {
        let avatarUrl = msg.author_avatar_url;
        
        // If no avatar stored, try to get from auth.users metadata
        if (!avatarUrl) {
          try {
            const { data: userData } = await serviceSupabase.auth.admin.getUserById(msg.author_id);
            avatarUrl = userData?.user?.user_metadata?.avatar_url || 
                       userData?.user?.user_metadata?.avatar || 
                       null;
            
            // Update the message with the avatar URL for future queries
            if (avatarUrl) {
              await serviceSupabase
                .from("event_message_board")
                .update({ author_avatar_url: avatarUrl })
                .eq("id", msg.id);
            }
          } catch (err) {
            // Ignore errors fetching user metadata
            console.error("Error fetching user avatar:", err);
          }
        }
        
        return {
          id: msg.id,
          event_id: msg.event_id,
          sender_id: msg.author_id,
          sender_name: msg.author_name,
          sender_email: msg.author_email,
          sender_avatar_url: avatarUrl,
          message: msg.message,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
        };
      })
    );

    return NextResponse.json({ messages: messagesWithAvatars });
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

    // Get user email and avatar for denormalization
    const authorEmail = user.email || "";
    const authorName = user.user_metadata?.name || authorEmail.split("@")[0] || "User";
    const authorAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.avatar || null;

    // Insert message
    const { data: newMessage, error } = await serviceSupabase
      .from("event_message_board")
      .insert({
        event_id: params.eventId,
        author_id: user.id,
        author_email: authorEmail,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl,
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
