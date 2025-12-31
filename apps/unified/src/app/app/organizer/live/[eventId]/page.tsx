"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Logo, Button, Input, Modal, LoadingSpinner, VipStatus } from "@crowdstack/ui";
import { Users, Activity, Trophy, Clock, TrendingUp, MessageSquare, Send, Edit2, Trash2, User, Mail, Phone, Instagram, ExternalLink } from "lucide-react";
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
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState<any | null>(null);
  const [loadingAttendee, setLoadingAttendee] = useState(false);

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

  const loadAttendeeDetails = async (attendeeId: string) => {
    setLoadingAttendee(true);
    setSelectedAttendeeId(attendeeId);
    try {
      const response = await fetch(`/api/events/${eventId}/attendee/${attendeeId}`);
      if (!response.ok) {
        throw new Error("Failed to load attendee details");
      }
      const data = await response.json();
      setAttendeeDetails(data);
    } catch (error) {
      console.error("Error loading attendee details:", error);
      setAttendeeDetails(null);
    } finally {
      setLoadingAttendee(false);
    }
  };

  const handleAttendeeClick = (attendeeId: string) => {
    loadAttendeeDetails(attendeeId);
  };

  const handleCloseAttendeeModal = () => {
    setSelectedAttendeeId(null);
    setAttendeeDetails(null);
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
      setLoading(false);
    } catch (error) {
      console.error("Error loading metrics:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner text="Loading live metrics..." size="lg" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary mb-2">Failed to load metrics</p>
          <p className="text-sm text-secondary mb-4">Unable to load live event metrics. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Live Mission Control</h1>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm font-medium text-primary">{metrics.event_name}</p>
            {metrics.venue_name && (
              <p className="text-sm text-secondary">{metrics.venue_name}</p>
            )}
          </div>
        </div>
        <Badge variant="success" className="flex items-center gap-2">
          <div className="h-2 w-2 bg-accent-success rounded-full animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Hero Metric - Live Attendance */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
              Live Attendance
            </p>
            <div className="flex items-baseline gap-4">
              <p className="text-6xl font-mono font-bold tracking-tighter text-primary">
                {metrics.current_attendance}
              </p>
              {metrics.capacity && (
                <>
                  <span className="text-2xl text-muted">/</span>
                  <p className="text-4xl font-mono font-bold tracking-tighter text-secondary">
                    {metrics.capacity}
                  </p>
                </>
              )}
            </div>
            {metrics.capacity && (
              <div className="mt-4 h-2 bg-raised rounded-full overflow-hidden max-w-md">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary transition-all duration-500"
                  style={{ width: `${metrics.capacity_percentage}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10 border border-accent-success/30">
            <Activity className="h-8 w-8 text-accent-success animate-pulse" />
          </div>
        </div>
      </Card>

      {/* Flow Rate Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="!p-1.5">
          <div className="space-y-0.5">
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary truncate">
              Total Reg.
            </p>
            <p className="text-lg font-mono font-bold tracking-tighter text-primary">
              {metrics.total_registrations}
            </p>
          </div>
        </Card>

        <Card className="!p-1.5">
          <div className="space-y-0.5">
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary truncate">
              Last 15m
            </p>
            <p className="text-lg font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_15min}
            </p>
          </div>
        </Card>

        <Card className="!p-1.5">
          <div className="space-y-0.5">
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary truncate">
              Last Hour
            </p>
            <p className="text-lg font-mono font-bold tracking-tighter text-primary">
              {metrics.check_ins_last_hour}
            </p>
          </div>
        </Card>

        <Card className="!p-1.5">
          <div className="space-y-0.5">
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary truncate">
              Peak Hour
            </p>
            <p className="text-lg font-mono font-bold tracking-tighter text-primary">
              {metrics.peak_hour || "—"}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Promoter Leaderboard */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-header">Promoter Leaderboard</h2>
              <Trophy className="h-4 w-4 text-muted" />
            </div>
            <div className="space-y-2">
              {metrics.promoter_stats.slice(0, 5).map((promoter) => (
                <div
                  key={promoter.promoter_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-raised"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-secondary/10 text-primary text-sm font-bold">
                      #{promoter.rank}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{promoter.promoter_name}</p>
                      <p className="text-xs text-secondary">{promoter.check_ins} check-ins</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="section-header">Recent Activity</h2>
              <Clock className="h-4 w-4 text-muted" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.recent_activity.slice(0, 20).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-raised"
                >
                  <div className="flex items-center gap-2">
                    {activity.type === "checkin" ? (
                      <div className="h-2 w-2 rounded-full bg-accent-success" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-accent-secondary" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        {activity.attendee_id ? (
                          <button
                            onClick={() => handleAttendeeClick(activity.attendee_id)}
                            className="text-sm font-medium text-primary hover:text-accent-secondary transition-colors cursor-pointer text-left"
                          >
                            {activity.attendee_name}
                          </button>
                        ) : (
                          <p className="text-sm font-medium text-primary">{activity.attendee_name}</p>
                        )}
                        <VipStatus
                          isGlobalVip={activity.is_global_vip}
                          isVenueVip={activity.is_venue_vip}
                          isOrganizerVip={activity.is_organizer_vip}
                          variant="badge"
                          size="xs"
                          showHighestOnly
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-secondary">
                          {activity.type === "checkin" ? "Checked in" : "Registered"}
                        </p>
                        {activity.promoter_name && (
                          <>
                            <span className="text-xs text-secondary">•</span>
                            <p className="text-xs text-secondary">via {activity.promoter_name}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {metrics.recent_activity.length === 0 && (
                <p className="text-sm text-secondary text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Message Board */}
      <Card>
        <div className="space-y-4 relative" style={{ paddingBottom: "80px" }}>
          <div className="flex items-center justify-between">
            <h2 className="section-header flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message Board
            </h2>
          </div>

              {/* Messages List */}
              <div 
                ref={messagesContainerRef}
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {messages.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">No messages yet. Be the first to post!</p>
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
                          <div className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-accent-error/20 rounded-r-md pointer-events-none">
                            <Trash2 className="h-5 w-5 text-accent-error" />
                          </div>
                        )}
                        
                        <div
                          className={`p-3 rounded-lg bg-raised ${
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
                                  <p className="text-xs text-secondary">
                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {msg.updated_at !== msg.created_at && (
                                      <span className="ml-1 text-muted">(edited)</span>
                                    )}
                                  </p>
                                  {isOwnMessage && (
                                    <div className="flex gap-1 ml-auto">
                                      <button
                                        onClick={() => {
                                          setEditingId(msg.id);
                                          setEditText(msg.message);
                                        }}
                                        className="p-1 text-muted hover:text-primary transition-colors"
                                        title="Edit message"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 text-muted hover:text-accent-error transition-colors"
                                        title="Delete message"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm text-primary whitespace-pre-wrap break-words">{msg.message}</p>
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
                className="absolute bottom-0 left-0 right-0 bg-void/95 backdrop-blur-sm px-4 py-3 border-t border-border-subtle flex gap-2 z-10"
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
                  className="flex-1"
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
          </Card>

      {/* Attendee Profile Modal */}
      <Modal
        isOpen={selectedAttendeeId !== null}
        onClose={handleCloseAttendeeModal}
        title="Attendee Profile"
        size="md"
      >
        {loadingAttendee ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-secondary">Loading profile...</div>
          </div>
        ) : attendeeDetails?.attendee ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <Avatar
                avatarUrl={attendeeDetails.attendee.avatar_url}
                name={attendeeDetails.attendee.name || ""}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {attendeeDetails.attendee.name} {attendeeDetails.attendee.surname || ""}
                </h3>
                {attendeeDetails.registration && (
                  <p className="text-sm text-secondary">
                    Registered {new Date(attendeeDetails.registration.registered_at).toLocaleDateString()}
                  </p>
                )}
                {attendeeDetails.checkin && (
                  <p className="text-sm text-green-500">
                    Checked in {new Date(attendeeDetails.checkin.checked_in_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3 border-t border-border-subtle pt-4">
              {attendeeDetails.attendee.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-secondary" />
                  <a
                    href={`mailto:${attendeeDetails.attendee.email}`}
                    className="text-sm text-primary hover:text-primary transition-colors"
                  >
                    {attendeeDetails.attendee.email}
                  </a>
                </div>
              )}
              {attendeeDetails.attendee.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-secondary" />
                  <a
                    href={`tel:${attendeeDetails.attendee.phone}`}
                    className="text-sm text-primary hover:text-primary transition-colors"
                  >
                    {attendeeDetails.attendee.phone}
                  </a>
                </div>
              )}
              {attendeeDetails.attendee.instagram_handle && (
                <div className="flex items-center gap-3">
                  <Instagram className="h-4 w-4 text-secondary" />
                  <a
                    href={`https://instagram.com/${attendeeDetails.attendee.instagram_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    @{attendeeDetails.attendee.instagram_handle.replace(/^@/, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Previous Events */}
            {attendeeDetails.previous_events && attendeeDetails.previous_events.length > 0 && (
              <div className="border-t border-border-subtle pt-4">
                <h4 className="text-sm font-semibold text-primary mb-3">Previous Events</h4>
                <div className="space-y-2">
                  {attendeeDetails.previous_events.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-raised"
                    >
                      <div>
                        <p className="text-sm font-medium text-primary">{event.name}</p>
                        <p className="text-xs text-secondary">
                          {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      {event.attended && (
                        <Badge variant="success" className="text-xs">
                          Attended
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-secondary">Failed to load profile</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
