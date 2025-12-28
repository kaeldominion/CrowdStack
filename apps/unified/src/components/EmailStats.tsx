"use client";

import { useState, useEffect } from "react";
import { Card, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Mail, CheckCircle2, Eye, MousePointerClick, AlertCircle, TrendingUp } from "lucide-react";

interface EmailStatsProps {
  eventId: string;
}

interface EmailStat {
  type: string;
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  emails: Array<{
    id: string;
    recipient_email: string;
    subject: string;
    created_at: string;
    delivered_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    bounced_at: string | null;
    bounce_reason: string | null;
  }>;
}

export function EmailStats({ eventId }: EmailStatsProps) {
  const [stats, setStats] = useState<EmailStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [eventId]);

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/email-stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || []);
        if (data.stats && data.stats.length > 0) {
          setSelectedType(data.stats[0].type);
        }
      }
    } catch (error) {
      console.error("Failed to load email stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      photo_notification: "Photo Notifications",
      event_invite: "Event Invites",
      registration_confirmation: "Registration Confirmations",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const selectedStat = stats.find((s) => s.type === selectedType);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner text="Loading email stats..." />
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className="!p-8 text-center border-dashed">
        <Mail className="h-12 w-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-primary mb-2">No Email Stats Yet</h3>
        <p className="text-sm text-secondary">
          Email delivery statistics will appear here once emails are sent.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type Tabs */}
      <div className="flex gap-2 border-b border-border-subtle">
        {stats.map((stat) => (
          <button
            key={stat.type}
            onClick={() => setSelectedType(stat.type)}
            className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              selectedType === stat.type
                ? "border-accent-primary text-primary"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {getTypeLabel(stat.type)}
            <Badge color="slate" variant="solid" size="sm" className="ml-2">
              {stat.total}
            </Badge>
          </button>
        ))}
      </div>

      {selectedStat && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card padding="compact">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Delivered
                </p>
                <CheckCircle2 className="h-4 w-4 text-accent-success" />
              </div>
              <p className="text-2xl font-mono font-bold text-primary">
                {selectedStat.delivered}
              </p>
              <p className="text-xs text-muted mt-1">
                {selectedStat.deliveryRate.toFixed(1)}% rate
              </p>
            </Card>

            <Card padding="compact">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Opened
                </p>
                <Eye className="h-4 w-4 text-accent-secondary" />
              </div>
              <p className="text-2xl font-mono font-bold text-primary">
                {selectedStat.opened}
              </p>
              <p className="text-xs text-muted mt-1">
                {selectedStat.openRate.toFixed(1)}% rate
              </p>
            </Card>

            <Card padding="compact">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Clicked
                </p>
                <MousePointerClick className="h-4 w-4 text-accent-primary" />
              </div>
              <p className="text-2xl font-mono font-bold text-primary">
                {selectedStat.clicked}
              </p>
              <p className="text-xs text-muted mt-1">
                {selectedStat.clickRate.toFixed(1)}% rate
              </p>
            </Card>

            <Card padding="compact">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Bounced
                </p>
                <AlertCircle className="h-4 w-4 text-accent-error" />
              </div>
              <p className="text-2xl font-mono font-bold text-primary">
                {selectedStat.bounced}
              </p>
              <p className="text-xs text-muted mt-1">
                {selectedStat.bounceRate.toFixed(1)}% rate
              </p>
            </Card>
          </div>

          {/* Email List */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="section-header">Email Details</h3>
                <Badge color="slate" variant="solid" size="sm">
                  {selectedStat.emails.length} emails
                </Badge>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedStat.emails.map((email) => (
                  <div
                    key={email.id}
                    className="p-3 rounded-lg bg-raised border border-border-subtle"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {email.recipient_email}
                        </p>
                        <p className="text-xs text-secondary mt-0.5 truncate">
                          {email.subject}
                        </p>
                        <p className="text-[10px] text-muted mt-1 font-mono">
                          Sent: {new Date(email.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {email.delivered_at && (
                          <Badge color="success" variant="solid" size="sm" title="Delivered">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          </Badge>
                        )}
                        {email.opened_at && (
                          <Badge color="secondary" variant="solid" size="sm" title="Opened">
                            <Eye className="h-3 w-3 mr-1" />
                          </Badge>
                        )}
                        {email.clicked_at && (
                          <Badge color="primary" variant="solid" size="sm" title="Clicked">
                            <MousePointerClick className="h-3 w-3 mr-1" />
                          </Badge>
                        )}
                        {email.bounced_at && (
                          <Badge color="error" variant="solid" size="sm" title={`Bounced: ${email.bounce_reason || "Unknown"}`}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

