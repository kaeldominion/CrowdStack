"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, Badge, Button, Input, Modal, LoadingSpinner } from "@crowdstack/ui";
import { Users, Activity, Trophy, Clock, MessageSquare, Send, Edit2, Trash2, User, Mail, Phone, Instagram, ExternalLink } from "lucide-react";
import type { LiveMetrics } from "@/lib/data/live-metrics";
import { Avatar } from "@/components/Avatar";
import { createBrowserClient } from "@crowdstack/shared/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { VelocityChart } from "@/components/dashboard/VelocityChart";
import { ProgressMetric } from "@/components/dashboard/ProgressMetric";

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

export default function UnifiedEventLiveDashboardPage() {
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const userScrolledUp = useRef<boolean>(false);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [attendeeDetails, setAttendeeDetails] = useState<any | null>(null);
  const [loadingAttendee, setLoadingAttendee] = useState(false);

  // Determine user's role and permissions
  const isOrganizer = userRoles.includes("event_organizer");
  const isVenue = userRoles.includes("venue_admin");
  const isPromoter = userRoles.includes("promoter");
  const isSuperadmin = userRoles.includes("superadmin");

  // Permission flags - what sections can this user see?
  const canSeeFullMetrics = isOrganizer || isVenue || isSuperadmin;
  const canSeePromoterLeaderboard = isOrganizer || isVenue || isPromoter || isSuperadmin;
  const canSeeRecentActivity = isOrganizer || isVenue || isSuperadmin;
  const canSeeMessageBoard = isOrganizer || isVenue || isSuperadmin;
  const canSeeVelocityChart = isOrganizer || isVenue || isSuperadmin;

  useEffect(() => {
    loadUserRoles();
    loadMetrics();
    loadMessages();
    loadCurrentUser();
    const metricsInterval = setInterval(loadMetrics, 5000);
    const messagesInterval = setInterval(loadMessages, 3000);
    return () => {
      clearInterval(metricsInterval);
      clearInterval(messagesInterval);
    };
  }, [eventId]);

  const loadUserRoles = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (roles) {
          setUserRoles(roles.map(r => r.role));
        }
      }
    } catch (error) {
      console.error("Error loading user roles:", error);
    }
  };

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
    if (canSeeRecentActivity) {
      loadAttendeeDetails(attendeeId);
    }
  };

  const handleCloseAttendeeModal = () => {
    setSelectedAttendeeId(null);
    setAttendeeDetails(null);
  };

  useEffect(() => {
    if (!messagesContainerRef.current || userScrolledUp.current || sending) return;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!messagesContainerRef.current || sending) return;
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      });
    });
  }, [messages, sending]);

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
    if (!canSeeMessageBoard) return;
    
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
    if (!newMessage.trim() || !canSeeMessageBoard) return;

    const messageText = newMessage.trim();
    setSending(true);
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

      setNewMessage("");
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
    
    if (swipeOffset < -80) {
      handleDeleteMessage(messageId);
    } else {
      setSwipeOffset(0);
      setSwipingId(null);
    }
    
    swipeStartX.current = null;
  }, [swipingId, swipeOffset, handleDeleteMessage]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <LoadingSpinner text="Loading live metrics..." size="lg" />
      </div>
    );
  }

  // Build promoter leaderboard entries
  const leaderboardEntries = canSeePromoterLeaderboard && metrics.promoter_stats
    ? metrics.promoter_stats.slice(0, 5).map((promoter) => ({
        rank: promoter.rank,
        name: promoter.promoter_name,
        primaryStat: isPromoter ? promoter.check_ins : promoter.check_ins,
        primaryLabel: isPromoter ? "Check-ins" : "Check-ins",
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight">Event Dashboard</h1>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm font-medium text-primary">{metrics.event_name}</p>
            {metrics.venue_name && (
              <p className="text-sm text-secondary">{metrics.venue_name}</p>
            )}
          </div>
        </div>
        <Badge color="red" variant="solid" className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </Badge>
      </div>

      {/* Hero Metric - Live Attendance (all roles can see) */}
      {canSeeFullMetrics && (
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
                    <div className="mt-4 max-w-md">
                      <ProgressMetric 
                        label="Capacity" 
                        value={metrics.capacity_percentage} 
                        color={metrics.capacity_percentage >= 90 ? "error" : metrics.capacity_percentage >= 70 ? "warning" : "success"}
                        size="sm"
                      />
                    </div>
                  )}
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/10 border border-accent-success/30">
              <Activity className="h-8 w-8 text-accent-success animate-pulse" />
            </div>
          </div>
        </Card>
      )}

      {/* Promoter View - My Check-ins */}
      {isPromoter && !canSeeFullMetrics && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
                My Check-ins
              </p>
              <p className="text-6xl font-mono font-bold tracking-tighter text-primary">
                {metrics.promoter_stats?.find((p) => p.rank <= 5)?.check_ins || 0}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <Badge color="purple" variant="solid">
                  #{metrics.promoter_stats?.find((p) => p.rank <= 5)?.rank || "—"} of {metrics.promoter_stats?.length || 0}
                </Badge>
                <span className="text-sm text-secondary">Leaderboard position</span>
              </div>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-secondary/10 border border-accent-secondary/30">
              <Users className="h-8 w-8 text-accent-secondary animate-pulse" />
            </div>
          </div>
        </Card>
      )}

      {/* Stats Row */}
      {canSeeFullMetrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Registrations"
            value={metrics.total_registrations}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Last 15 Min"
            value={metrics.check_ins_last_15min}
            accent="success"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Last Hour"
            value={metrics.check_ins_last_hour}
            accent="primary"
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            label="Peak Hour"
            value={metrics.peak_hour || "—"}
            accent="warning"
            icon={<Activity className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Promoter Leaderboard */}
        {canSeePromoterLeaderboard && leaderboardEntries.length > 0 && (
          <Leaderboard
            title="Leaderboard"
            entries={leaderboardEntries}
          />
        )}

        {/* Recent Activity */}
        {canSeeRecentActivity && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-header">Recent Activity</h2>
                <Clock className="h-4 w-4 text-muted" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {metrics.recent_activity?.slice(0, 20).map((activity) => (
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
                {(!metrics.recent_activity || metrics.recent_activity.length === 0) && (
                  <p className="text-sm text-secondary text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Velocity Chart - only for organizer/venue */}
      {canSeeVelocityChart && (
        <VelocityChart />
      )}

      {/* Message Board - only for organizer/venue */}
      {canSeeMessageBoard && (
        <Card>
          <div className="space-y-4 relative" style={{ paddingBottom: "80px" }}>
            <div className="flex items-center justify-between">
              <h2 className="section-header flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Board
              </h2>
            </div>

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
                            <div className="flex-shrink-0">
                              <Avatar
                                name={msg.sender_name}
                                email={msg.sender_email}
                                avatarUrl={msg.sender_avatar_url}
                                size="sm"
                              />
                            </div>
                            
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
      )}

      {/* Attendee Profile Modal */}
      {canSeeRecentActivity && (
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
      )}
    </div>
  );
}

