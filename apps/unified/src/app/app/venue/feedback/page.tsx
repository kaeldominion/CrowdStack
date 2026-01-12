"use client";

import { useState, useEffect } from "react";
import { Card, Badge, Button, LoadingSpinner, useToast, Tabs, TabsList, TabsTrigger, TabsContent } from "@crowdstack/ui";
import { Star, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface FeedbackItem {
  id: string;
  rating: number;
  feedback_type: "positive" | "negative";
  comment?: string | null;
  categories: string[];
  free_text?: string | null;
  submitted_at: string;
  attendee_name?: string | null;
  event_id: string;
  event_name: string;
  event_date?: string;
  resolved_at?: string | null;
  internal_notes?: string | null;
}

interface VenueFeedbackStats {
  total_feedback: number;
  average_rating: number;
  events_with_feedback: number;
  rating_distribution: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  };
  category_breakdown: Record<string, number>;
  recent_feedback: FeedbackItem[];
}

export default function VenueFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VenueFeedbackStats | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unresolved" | "resolved">("all");
  const { toast } = useToast();

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/venue/feedback/stats");
      if (!response.ok) {
        throw new Error("Failed to load feedback");
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error loading feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback data.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedback = stats?.recent_feedback.filter((item) => {
    if (activeTab === "resolved") return item.resolved_at;
    if (activeTab === "unresolved") return !item.resolved_at;
    return true;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <div className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-secondary mx-auto mb-4" />
          <p className="text-secondary">No feedback data available.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Venue Pulse</h1>
        <p className="text-sm text-secondary mt-2">
          View and manage feedback from attendees across all your events
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Average Rating</span>
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.average_rating.toFixed(1)}
            </div>
            <div className="text-sm text-secondary mt-1">out of 5.0</div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Total Feedback</span>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.total_feedback}
            </div>
            <div className="text-sm text-secondary mt-1">
              from {stats.events_with_feedback} events
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Unresolved</span>
              <XCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.recent_feedback.filter((f) => !f.resolved_at).length}
            </div>
            <div className="text-sm text-secondary mt-1">needs attention</div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-secondary">Resolved</span>
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-primary">
              {stats.recent_feedback.filter((f) => f.resolved_at).length}
            </div>
            <div className="text-sm text-secondary mt-1">addressed</div>
          </div>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[rating.toString() as keyof typeof stats.rating_distribution];
              const percentage = stats.total_feedback > 0 
                ? (count / stats.total_feedback) * 100 
                : 0;
              
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-secondary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium w-12 text-right">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Feedback List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Feedback</h3>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-secondary mx-auto mb-4" />
              <p className="text-secondary">
                {activeTab === "all" 
                  ? "No feedback yet" 
                  : activeTab === "unresolved"
                  ? "No unresolved feedback"
                  : "No resolved feedback"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((item) => (
                <FeedbackItemCard
                  key={item.id}
                  item={item}
                  onUpdate={loadFeedback}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function FeedbackItemCard({ 
  item, 
  onUpdate 
}: { 
  item: FeedbackItem; 
  onUpdate: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(item.internal_notes || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleMarkResolved = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/venue/feedback/${item.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: !item.resolved_at }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      toast({
        title: "Success",
        description: item.resolved_at 
          ? "Feedback marked as unresolved" 
          : "Feedback marked as resolved",
        variant: "success",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/venue/feedback/${item.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      toast({
        title: "Success",
        description: "Internal notes saved",
        variant: "success",
      });

      setShowNotes(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border-subtle rounded-lg p-4 hover:bg-secondary/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= item.rating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <Badge
              variant={item.feedback_type === "positive" ? "success" : "warning"}
            >
              {item.feedback_type === "positive" ? "Positive" : "Negative"}
            </Badge>
            {item.resolved_at ? (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </Badge>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Unresolved
              </Badge>
            )}
            {item.attendee_name && (
              <span className="text-sm text-secondary">
                from {item.attendee_name}
              </span>
            )}
            <Link 
              href={`/app/venue/events/${item.event_id}`}
              className="text-sm text-primary hover:underline"
            >
              {item.event_name}
            </Link>
            <span className="text-xs text-secondary">
              {new Date(item.submitted_at).toLocaleDateString()}
            </span>
          </div>

          {item.comment && (
            <p className="text-sm text-primary mb-2">{item.comment}</p>
          )}

          {item.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {item.categories.map((cat) => (
                <Badge key={cat} variant="outline" size="sm">
                  {cat.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          )}

          {item.free_text && (
            <p className="text-sm text-primary mb-2">{item.free_text}</p>
          )}

          {item.internal_notes && !showNotes && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs">
              <strong>Internal Notes:</strong> {item.internal_notes}
            </div>
          )}

          {showNotes && (
            <div className="mt-2 space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes (not visible to attendees)..."
                className="w-full p-2 border border-border-subtle rounded text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveNotes}
                  disabled={saving}
                  loading={saving}
                >
                  Save Notes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowNotes(false);
                    setNotes(item.internal_notes || "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <Button
            size="sm"
            variant={item.resolved_at ? "secondary" : "primary"}
            onClick={handleMarkResolved}
            disabled={saving}
            loading={saving}
          >
            {item.resolved_at ? "Mark Unresolved" : "Mark Resolved"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? "Cancel" : item.internal_notes ? "Edit Notes" : "Add Notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
