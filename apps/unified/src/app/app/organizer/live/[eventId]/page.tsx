"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { BentoCard } from "@/components/BentoCard";
import { Badge, Logo, Button, Input } from "@crowdstack/ui";
import { Users, Activity, Trophy, Clock, TrendingUp, MessageSquare, Send, Edit2, Trash2 } from "lucide-react";
import type { LiveMetrics } from "@/lib/data/live-metrics";

interface EventMessage {
  id: string;
  event_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string | null;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMetrics();
    loadMessages();
    const metricsInterval = setInterval(loadMetrics, 5000); // Poll metrics every 5 seconds
    const messagesInterval = setInterval(loadMessages, 3000); // Poll messages every 3 seconds
    return () => {
      clearInterval(metricsInterval);
      clearInterval(messagesInterval);
    };
  }, [eventId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    setSending(true);
    try {
      const response = await fetch(`/api/events/${eventId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      setNewMessage("");
      loadMessages(); // Reload messages
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
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const response = await fetch(`/api/events/${eventId}/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete message");
      }

      loadMessages();
    } catch (error: any) {
      alert(error.message || "Failed to delete message");
    }
  };

  if (loading || !metrics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Loading live metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black w-full">
      <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:py-6">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message Board
                </p>
              </div>

              {/* Messages List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-8">No messages yet. Be the first to post!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-md bg-white/5 border border-white/10"
                    >
                      {editingId === msg.id ? (
                        <div className="space-y-2">
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
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{msg.sender_name}</p>
                              <p className="text-xs text-white/40">
                                {new Date(msg.created_at).toLocaleString()}
                                {msg.updated_at !== msg.created_at && " (edited)"}
                              </p>
                            </div>
                            <div className="flex gap-1">
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
                          </div>
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* New Message Input */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
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
