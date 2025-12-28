"use client";

import { useState, useEffect } from "react";
import { Button, Card, InlineSpinner } from "@crowdstack/ui";
import { X, Send, Mail, Users, UserCheck, AlertCircle, CheckCircle2 } from "lucide-react";

interface NotifyAttendeesModalProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface NotifySettings {
  recipient_mode: "registered" | "attended";
  auto_email_on_publish: boolean;
  last_notified_at: string | null;
}

interface RecipientCounts {
  registered: number;
  attended: number;
}

export function NotifyAttendeesModal({
  eventId,
  isOpen,
  onClose,
  onSuccess,
}: NotifyAttendeesModalProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<NotifySettings | null>(null);
  const [counts, setCounts] = useState<RecipientCounts>({ registered: 0, attended: 0 });
  const [recipientMode, setRecipientMode] = useState<"registered" | "attended">("registered");
  const [customMessage, setCustomMessage] = useState("");
  const [sendTestToMe, setSendTestToMe] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, eventId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/photos/notify`);
      const data = await response.json();

      if (response.ok) {
        setSettings({
          recipient_mode: data.album.recipient_mode,
          auto_email_on_publish: data.album.auto_email_on_publish,
          last_notified_at: data.album.last_notified_at,
        });
        setCounts(data.recipient_counts);
        setRecipientMode(data.album.recipient_mode);
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      setSending(true);
      setResult(null);

      const response = await fetch(`/api/events/${eventId}/photos/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_mode: recipientMode,
          custom_message: customMessage || undefined,
          send_test_to_me: sendTestToMe,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || `Successfully sent ${data.sent} emails`,
        });
        if (!sendTestToMe) {
          onSuccess?.();
        }
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to send notifications",
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "An error occurred",
      });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const currentRecipientCount = recipientMode === "attended" ? counts.attended : counts.registered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent-secondary/10">
                <Mail className="h-5 w-5 text-accent-secondary" />
              </div>
              <h2 className="text-xl font-bold text-primary">Notify Attendees</h2>
            </div>
            <p className="text-secondary text-sm">
              Send an email to let attendees know photos are available
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <InlineSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Recipient Mode */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-primary">
                  Send to
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRecipientMode("registered")}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      recipientMode === "registered"
                        ? "border-accent-secondary bg-accent-secondary/10 text-primary"
                        : "border-border bg-glass text-secondary hover:border-border-hover"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Registered</div>
                      <div className="text-xs opacity-70">{counts.registered} people</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setRecipientMode("attended")}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                      recipientMode === "attended"
                        ? "border-accent-secondary bg-accent-secondary/10 text-primary"
                        : "border-border bg-glass text-secondary hover:border-border-hover"
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">Checked In</div>
                      <div className="text-xs opacity-70">{counts.attended} people</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary">
                  Custom message <span className="text-secondary font-normal">(optional)</span>
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to include in the email..."
                  className="w-full px-3 py-2 rounded-lg bg-glass border border-border focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary text-primary placeholder:text-secondary/50 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-secondary text-right">
                  {customMessage.length}/500
                </p>
              </div>

              {/* Test Email Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendTestToMe"
                  checked={sendTestToMe}
                  onChange={(e) => setSendTestToMe(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="sendTestToMe" className="text-sm text-primary">
                  Send test email to me only
                </label>
              </div>

              {/* Last Notified */}
              {settings?.last_notified_at && (
                <div className="flex items-center gap-2 text-xs text-secondary bg-glass rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    Last notification sent:{" "}
                    {new Date(settings.last_notified_at).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Result Message */}
              {result && (
                <div
                  className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                    result.success
                      ? "bg-accent-success/10 text-accent-success"
                      : "bg-accent-error/10 text-accent-error"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{result.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={sending || (!sendTestToMe && currentRecipientCount === 0)}
                  className="flex-1"
                >
                  {sending ? (
                    <>
                      <InlineSpinner size="sm" className="mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {sendTestToMe
                        ? "Send Test"
                        : `Send to ${currentRecipientCount}`}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

