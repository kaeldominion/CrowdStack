"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, Badge, LoadingSpinner, Modal } from "@crowdstack/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Mail, CheckCircle2, Eye, MousePointerClick, AlertCircle, TrendingUp, ChevronRight } from "lucide-react";

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
      open_count?: number;
      click_count?: number;
    }>;
}

export function EmailStats({ eventId }: EmailStatsProps) {
  const [stats, setStats] = useState<EmailStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [emailDetails, setEmailDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

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
      event_reminder_6h: "Event Reminders (6h)",
      dj_gig_invitation: "DJ Gig Invitations",
      dj_gig_confirmed: "DJ Gig Confirmations",
      dj_gig_reminder_24h: "DJ Gig Reminders (24h)",
      dj_gig_reminder_4h: "DJ Gig Reminders (4h)",
      welcome: "Welcome Emails",
      venue_admin_welcome: "Venue Admin Welcome",
      event_organizer_welcome: "Event Organizer Welcome",
      promoter_welcome: "Promoter Welcome",
      dj_welcome: "DJ Welcome",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const selectedStat = stats.find((s) => s.type === selectedType);
  const emails = selectedStat?.emails || [];

  // Virtual scrolling for emails
  const rowVirtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const loadEmailDetails = async (emailId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`/api/admin/emails/${emailId}`);
      if (response.ok) {
        const data = await response.json();
        setEmailDetails(data);
      }
    } catch (error) {
      console.error("Failed to load email details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEmailClick = (emailId: string) => {
    setSelectedEmail(emailId);
    loadEmailDetails(emailId);
  };

  const formatDateCompact = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

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

          {/* Email List - Compact Format */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="section-header">Email Details</h3>
                <Badge color="slate" variant="solid" size="sm">
                  {emails.length} emails
                </Badge>
              </div>

              <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_2fr_60px_60px_60px_60px_60px_24px] gap-2 px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <div>Recipient</div>
                  <div>Subject</div>
                  <div className="text-center">Sent</div>
                  <div className="text-center">Delivered</div>
                  <div className="text-center">Opened</div>
                  <div className="text-center">Clicked</div>
                  <div className="text-center">Bounced</div>
                  <div></div>
                </div>

                {/* Virtual Scrolling Container */}
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ height: Math.min(emails.length * 36 + 20, 600) }}
                >
                  {emails.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                      No emails found
                    </div>
                  ) : (
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const email = emails[virtualItem.index];
                        return (
                          <div
                            key={email.id}
                            className="grid grid-cols-[2fr_2fr_60px_60px_60px_60px_60px_24px] gap-2 items-center px-3 hover:bg-active transition-colors border-b border-[var(--border-subtle)]/50 cursor-pointer"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                            onClick={() => handleEmailClick(email.id)}
                          >
                            {/* Recipient */}
                            <div className="text-xs text-[var(--text-primary)] truncate">
                              {email.recipient_email}
                            </div>
                            {/* Subject */}
                            <div className="text-xs text-[var(--text-secondary)] truncate">
                              {email.subject}
                            </div>
                            {/* Sent Date */}
                            <div className="text-[10px] text-[var(--text-muted)] text-center">
                              {formatDateCompact(email.created_at)}
                            </div>
                            {/* Delivered */}
                            <div className="flex items-center justify-center">
                              {email.delivered_at ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent-success)]" />
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)]">-</span>
                              )}
                            </div>
                            {/* Opened */}
                            <div className="flex items-center justify-center">
                              {email.opened_at ? (
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5 text-[var(--accent-secondary)]" />
                                  {(email.open_count ?? 0) > 1 && (
                                    <span className="text-[10px] text-[var(--text-muted)]">{email.open_count}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)]">-</span>
                              )}
                            </div>
                            {/* Clicked */}
                            <div className="flex items-center justify-center">
                              {email.clicked_at ? (
                                <div className="flex items-center gap-1">
                                  <MousePointerClick className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                                  {(email.click_count ?? 0) > 1 && (
                                    <span className="text-[10px] text-[var(--text-muted)]">{email.click_count}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)]">-</span>
                              )}
                            </div>
                            {/* Bounced */}
                            <div className="flex items-center justify-center">
                              {email.bounced_at ? (
                                <AlertCircle className="h-3.5 w-3.5 text-[var(--accent-error)]" />
                              ) : (
                                <span className="text-[10px] text-[var(--text-muted)]">-</span>
                              )}
                            </div>
                            {/* Chevron */}
                            <div className="flex items-center justify-center">
                              <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    {emails.length} emails
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Email Detail Modal */}
      <Modal
        isOpen={!!selectedEmail}
        onClose={() => {
          setSelectedEmail(null);
          setEmailDetails(null);
        }}
        title="Email Details"
        size="lg"
      >
        {loadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner text="Loading email details..." />
          </div>
        ) : emailDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Recipient</p>
                <p className="text-sm text-[var(--text-primary)]">{emailDetails.email.recipient}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Subject</p>
                <p className="text-sm text-[var(--text-primary)]">{emailDetails.email.subject}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Status</p>
                <Badge
                  color={
                    emailDetails.email.status === "sent"
                      ? "green"
                      : emailDetails.email.status === "failed"
                      ? "red"
                      : emailDetails.email.status === "bounced"
                      ? "red"
                      : "amber"
                  }
                  variant="solid"
                  size="sm"
                >
                  {emailDetails.email.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Sent At</p>
                <p className="text-sm text-[var(--text-primary)]">
                  {new Date(emailDetails.email.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Engagement Stats */}
            {(emailDetails.email.opened_at || emailDetails.email.clicked_at) && (
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">Engagement</p>
                <div className="grid grid-cols-2 gap-4">
                  {emailDetails.email.opened_at && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Opened</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {new Date(emailDetails.email.opened_at).toLocaleString()}
                        {emailDetails.email.open_count && emailDetails.email.open_count > 1 && (
                          <span className="ml-2 text-[var(--text-muted)]">
                            ({emailDetails.email.open_count} times)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {emailDetails.email.clicked_at && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Clicked</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {new Date(emailDetails.email.clicked_at).toLocaleString()}
                        {emailDetails.email.click_count && emailDetails.email.click_count > 1 && (
                          <span className="ml-2 text-[var(--text-muted)]">
                            ({emailDetails.email.click_count} times)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Content Preview */}
            {emailDetails.rendered?.html && (
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">Email Preview</p>
                <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={emailDetails.rendered.html}
                    className="w-full h-96 border-0"
                    title="Email Preview"
                  />
                </div>
              </div>
            )}

            {/* Metadata */}
            {emailDetails.email.metadata && (
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">Metadata</p>
                <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-raised)] p-3 rounded-lg overflow-auto max-h-48">
                  {JSON.stringify(emailDetails.email.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

