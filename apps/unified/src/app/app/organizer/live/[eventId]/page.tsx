"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { BentoCard } from "@/components/BentoCard";
import { Badge, Logo, Button, Input } from "@crowdstack/ui";
import { Users, Activity, Trophy, Clock, TrendingUp, MessageSquare, Send, Edit2, Trash2 } from "lucide-react";
import type { LiveMetrics } from "@/lib/data/live-metrics";
import { Avatar } from "@/components/Avatar";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";

interface EventMessage {
  id: string;
  event_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string | null;
  sender_avatar_url?: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizerLiveMissionControlPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const userScrolledUp = useRef<boolean>(false);

  useEffect(() => {
    loadMetrics();
    loadMessages();
    loadCurrentUser();
    const metricsInterval = setInterval(loadMetrics, 5000); // Poll metrics every 5 seconds
    const messagesInterval = setInterval(loadMessages, 3000); // Poll messages every 3 seconds
    return () => {
      clearInterval(metricsInterval);
      clearInterval(messagesInterval);
    };
  }, [eventId]);

  const loadCurrentUser = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  useEffect(() => {
    // Only auto-scroll to bottom if user is near the bottom (within 100px)
    // This prevents interrupting manual scrolling
    // Skip scrolling if we're currently sending a message to avoid layout shifts
    if (!messagesContainerRef.current || userScrolledUp.current || sending) return;
    
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!messagesContainerRef.current || sending) return;
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
          // Use scrollTop for more predictable behavior
          container.scrollTop = container.scrollHeight;
        }
      });
    });
  }, [messages, sending]);

  // Track if user manually scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      userScrolledUp.current = !isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/live-metrics`);
      if (!response.ok) throw new Error("Failed to load metrics");
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/messages`);
      if (!response.ok) return;
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setSending(true);
    // Reset scroll flag so we'll auto-scroll to bottom after sending
    userScrolledUp.current = false;
    
    try {
      const response = await fetch(`/api/events/${eventId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      // Clear input immediately for better UX
      setNewMessage("");
      
      // Reload messages - the useEffect will handle scrolling smoothly
      loadMessages();
    } catch (error: any) {
      alert(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editText }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update message");
      }

      setEditingId(null);
      setEditText("");
      loadMessages();
    } catch (error: any) {
      alert(error.message || "Failed to update message");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete message");
      }

      loadMessages();
      setSwipingId(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete message");
      setSwipingId(null);
    }
  };

  // Swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, messageId: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return;
    swipeStartX.current = e.touches[0].clientX;
    setSwipingId(messageId);
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, isOwnMessage: boolean) => {
    if (!isOwnMessage || !swipingId || !swipeStartX.current) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - swipeStartX.current;
    // Only allow swiping left (negative deltaX)
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -100));
    }
  }, [swipingId]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, messageId: string) => {
    if (!swipingId || swipingId !== messageId) {
      setSwipingId(null);
      setSwipeOffset(0);
      swipeStartX.current = null;
      return;
    }
    
    // If swiped left more than 80px, delete
    if (swipeOffset < -80) {
      handleDeleteMessage(messageId);
    } else {
      // Snap back
      setSwipeOffset(0);
      setSwipingId(null);
    }
    
    swipeStartX.current = null;
  }, [swipingId, swipeOffset, handleDeleteMessage]);

  if (loading || !metrics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading live metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black w-full">
      <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-6">
        {/* Header with Branding */}
        <div className="mb-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
            <Logo variant="full" size="md" className="text-white" animated={false} />
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
        <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-white">Live Mission Control</h1>
              <div className="mt-1 sm:mt-2 space-y-0.5">
                <p className="text-sm font-medium text-white">{metrics.event_name}</p>
                {metrics.venue_name && (
                  <p className="text-sm text-white/60">{metrics.venue_name}</p>
                )}
              </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-white/60">Live</span>
            </div>
        </div>
      </div>

        <div className="space-y-4 sm:space-y-6">
      {/* Hero Metric - Live Attendance */}
      <BentoCard span={4}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">
              Live Attendance
            </p>
            <div className="flex items-baseline gap-4">
              <p className="text-6xl font-mono font-bold tracking-tighter text-white">
                {metrics.current_attendance}
              </p>
              {metrics.capacity && (
                <>
                  <span className="text-2xl text-white/40">/</span>
                  <p className="text-4xl font-mono font-bold tracking-tighter text-white/60">
                    {metrics.capacity}
                  </p>
                </>
              )}
            </div>
            {metrics.capacity && (
              <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${metrics.capacity_percentage}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-500/50">
            <Activity className="h-8 w-8 text-green-400 animate-pulse" />
          </div>
        </div>
      </BentoCard>

      {/* Flow Rate Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
              Last 15 Min
            </p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-white">
              {metrics.check_ins_last_15min}
            </p>
            <p className="text-sm text-white/40">check-ins</p>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
              Last Hour
            </p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-white">
              {metrics.check_ins_last_hour}
            </p>
            <p className="text-sm text-white/40">check-ins</p>
          </div>
        </BentoCard>

        <BentoCard>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40 font-medium">
              Peak Hour
            </p>
            <p className="text-3xl font-mono font-bold tracking-tighter text-white">
              {metrics.peak_hour || "—"}
            </p>
            <p className="text-sm text-white/40">most active</p>
          </div>
        </BentoCard>
      </div>

      {/* Promoter Leaderboard */}
      <BentoCard span={2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Promoter Leaderboard</p>
            <Trophy className="h-4 w-4 text-white/40" />
          </div>
          <div className="space-y-2">
            {metrics.promoter_stats.slice(0, 5).map((promoter, index) => (
              <div
                key={promoter.promoter_id}
                className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
                    #{promoter.rank}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{promoter.promoter_name}</p>
                    <p className="text-xs text-white/40">{promoter.check_ins} check-ins</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BentoCard>

      {/* Recent Activity */}
      <BentoCard span={2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Recent Activity</p>
            <Clock className="h-4 w-4 text-white/40" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {metrics.recent_checkins.slice(0, 10).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between p-2 rounded-md bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-white">{checkin.attendee_name}</p>
                  {checkin.promoter_name && (
                    <p className="text-xs text-white/40">via {checkin.promoter_name}</p>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  {new Date(checkin.checked_in_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </BentoCard>

          {/* Message Board */}
          <BentoCard span={4}>
            <div className="space-y-4 relative" style={{ paddingBottom: "80px" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message Board
                </p>
              </div>

              {/* Messages List */}
              <div 
                ref={messagesContainerRef}
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {messages.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-8">No messages yet. Be the first to post!</p>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = currentUserId === msg.sender_id;
                    return (
                      <div
                        key={msg.id}
                        className="relative group"
                        onTouchStart={(e) => handleTouchStart(e, msg.id, isOwnMessage)}
                        onTouchMove={(e) => handleTouchMove(e, isOwnMessage)}
                        onTouchEnd={(e) => handleTouchEnd(e, msg.id)}
                        style={{ touchAction: isOwnMessage ? "pan-y" : "auto" }}
                      >
                        {/* Swipe delete indicator */}
                        {isOwnMessage && (
                          <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500/20 rounded-r-md pointer-events-none">
                            <Trash2 className="h-5 w-5 text-red-400" />
                          </div>
                        )}
                        
                        <div
                          className={`p-3 rounded-md bg-white/5 border border-white/10 ${
                            swipingId === msg.id ? "" : "transition-transform duration-200"
                          } ${
                            editingId === msg.id ? "" : "flex gap-3"
                          }`}
                          style={{ 
                            transform: swipingId === msg.id 
                              ? `translateX(${swipeOffset}px)` 
                              : "translateX(0)" 
                          }}
                        >
                          {editingId === msg.id ? (
                            <div className="space-y-2 w-full">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Edit message..."
                                className="bg-white/10 border-white/20 text-white"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleEditMessage(msg.id)}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditText("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Avatar */}
                              <div className="flex-shrink-0">
                                <Avatar
                                  name={msg.sender_name}
                                  email={msg.sender_email}
                                  avatarUrl={msg.sender_avatar_url}
                                  size="sm"
                                />
                              </div>
                              
                              {/* Message content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs text-white/60">
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {msg.updated_at !== msg.created_at && (
                                      <span className="ml-1 text-white/40">(edited)</span>
                                    )}
                                  </p>
                                  {isOwnMessage && (
                                    <div className="flex gap-1 ml-auto">
                                      <button
                                        onClick={() => {
                                          setEditingId(msg.id);
                                          setEditText(msg.message);
                                        }}
                                        className="p-1 text-white/40 hover:text-white transition-colors"
                                        title="Edit message"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 text-white/40 hover:text-red-400 transition-colors"
                                        title="Delete message"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{msg.message}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* New Message Input - Fixed at bottom for mobile */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm px-4 py-3 border-t border-white/10 flex gap-2 z-10"
                style={{ 
                  paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
                  marginLeft: "-1rem",
                  marginRight: "-1rem",
                }}
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="bg-white/10 border-white/20 text-white flex-1"
                />
                <Button
                  variant="primary"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  loading={sending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
