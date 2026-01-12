"use client";

import { useState, useEffect, useRef } from "react";
import { Button, InlineSpinner } from "@crowdstack/ui";
import { Send, Trash2, User } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_avatar_url: string | null;
  content: string;
  created_at: string;
}

interface PhotoCommentsProps {
  photoId: string;
  isLoggedIn: boolean;
  currentUserId?: string;
  onCommentCountChange?: (count: number) => void;
}

export function PhotoComments({
  photoId,
  isLoggedIn,
  currentUserId,
  onCommentCountChange,
}: PhotoCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadComments();
  }, [photoId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos/${photoId}/comments`);
      const data = await response.json();

      if (response.ok) {
        setComments(data.comments || []);
        onCommentCountChange?.(data.count || 0);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
        onCommentCountChange?.(comments.length + 1);
        inputRef.current?.focus();
      } else {
        alert(data.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      setDeletingId(commentId);
      const response = await fetch(
        `/api/photos/${photoId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentCountChange?.(comments.length - 1);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <InlineSpinner size="sm" className="text-muted" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-secondary text-sm text-center py-4">
            No comments yet
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-2 group"
            >
              {/* Avatar */}
              <div className="shrink-0">
                {comment.user_avatar_url ? (
                  <img
                    src={comment.user_avatar_url}
                    alt={comment.user_name || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-active flex items-center justify-center">
                    <User className="h-4 w-4 text-muted" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary text-sm truncate">
                    {comment.user_name || "Anonymous"}
                  </span>
                  <span className="text-muted text-xs">
                    {formatTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-primary text-sm break-words">
                  {comment.content}
                </p>
              </div>

              {/* Delete button (only for own comments) */}
              {currentUserId === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted hover:text-accent-error"
                  title="Delete comment"
                >
                  {deletingId === comment.id ? (
                    <InlineSpinner size="sm" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input form */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-border-subtle">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              maxLength={1000}
              className="flex-1 px-3 py-2 rounded-lg bg-active border border-border-subtle text-primary placeholder:text-muted text-sm focus:outline-none focus:border-border-strong"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="p-2 rounded-lg bg-accent-secondary text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <InlineSpinner size="sm" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 pt-3 border-t border-border-subtle text-secondary text-sm text-center">
          Log in to comment
        </p>
      )}
    </div>
  );
}

