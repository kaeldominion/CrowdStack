"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, LoadingSpinner, Badge, Input, InlineSpinner, Modal, Button } from "@crowdstack/ui";
import { Mail, Filter, Eye, MousePointerClick, ChevronRight, Loader2 } from "lucide-react";

interface EmailLogEntry {
  id: string;
  template_id: string | null;
  template_slug: string;
  recipient: string;
  recipient_user_id: string | null;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  open_count: number;
  click_count: number;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface EmailLogsStats {
  total: number;
  totalSent: number;
  totalFailed: number;
  totalBounced: number;
  totalPending: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  todayCount: number;
  byType: Record<string, number>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function VenueEmailLogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<EmailLogsStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLogEntry | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when filters change
  useEffect(() => {
    setEmailLogs([]);
    setPagination(null);
    setLoading(true);
    loadEmails(1);
  }, [debouncedSearch, statusFilter, typeFilter, startDate, endDate]);

  const loadEmails = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("emailType", typeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/venue/emails?${params}`);
      if (!response.ok) throw new Error("Failed to load emails");
      const data = await response.json();

      if (page === 1) {
        setEmailLogs(data.emails || []);
        setStats(data.stats);
      } else {
        setEmailLogs((prev) => [...prev, ...(data.emails || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading emails:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadEmails(pagination.page + 1);
  }, [loadingMore, pagination]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pagination, loadingMore, loadMore]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="success" className="text-[10px]">Sent</Badge>;
      case "failed":
        return <Badge variant="error" className="text-[10px]">Failed</Badge>;
      case "bounced":
        return <Badge variant="error" className="text-[10px]">Bounced</Badge>;
      case "pending":
        return <Badge variant="warning" className="text-[10px]">Pending</Badge>;
      default:
        return <Badge variant="default" className="text-[10px]">{status}</Badge>;
    }
  };

  const getTypeBadge = (emailType: string) => {
    const colors: Record<string, string> = {
      template: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      feedback_request: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      magic_link: "bg-green-500/20 text-green-400 border-green-500/30",
      direct: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      system: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    const color = colors[emailType] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
        {emailType.replace(/_/g, " ")}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateCompact = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Email Activity</h1>
        <p className="text-sm text-secondary mt-2">
          View all emails sent for your venue and events
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="!p-3">
            <p className="text-xs text-secondary mb-1">Total Sent</p>
            <p className="text-2xl font-bold text-primary">{stats.totalSent}</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-secondary mb-1">Open Rate</p>
            <p className="text-2xl font-bold text-green-400">{stats.openRate.toFixed(1)}%</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-secondary mb-1">Click Rate</p>
            <p className="text-2xl font-bold text-blue-400">{stats.clickRate.toFixed(1)}%</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-secondary mb-1">Bounce Rate</p>
            <p className="text-2xl font-bold text-red-400">{stats.bounceRate.toFixed(1)}%</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-secondary mb-1">Today</p>
            <p className="text-2xl font-bold text-primary">{stats.todayCount}</p>
          </Card>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="!p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-secondary mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-raised border border-border-subtle text-sm text-primary"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Email Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-raised border border-border-subtle text-sm text-primary"
              >
                <option value="">All Types</option>
                <option value="template">Template</option>
                <option value="feedback_request">Feedback Request</option>
                <option value="magic_link">Magic Link</option>
                <option value="direct">Direct</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="!p-3">
        <Input
          placeholder="Search by recipient or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </Card>

      {/* Results Count */}
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
        Showing {emailLogs.length} of {pagination?.total || 0} emails
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </div>

      {/* Email Logs List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <InlineSpinner size="lg" />
          <p className="mt-4 text-sm text-secondary">Loading emails...</p>
        </div>
      ) : emailLogs.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No emails found</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid gap-2 px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] grid-cols-[2fr_2fr_80px_60px_60px_60px_60px_24px]">
            <div>Recipient</div>
            <div>Subject</div>
            <div className="text-center">Type</div>
            <div className="text-center">Status</div>
            <div className="text-center">Opens</div>
            <div className="text-center">Clicks</div>
            <div>Sent</div>
            <div></div>
          </div>

          {/* Email Rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {emailLogs.map((email) => (
              <div
                key={email.id}
                className="grid gap-2 items-center px-3 py-2 hover:bg-active transition-colors border-b border-[var(--border-subtle)]/50 cursor-pointer grid-cols-[2fr_2fr_80px_60px_60px_60px_60px_24px]"
                onClick={() => setSelectedEmail(email)}
              >
                {/* Recipient */}
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {email.recipient}
                </div>

                {/* Subject */}
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {email.subject}
                </div>

                {/* Type */}
                <div className="flex items-center justify-center">
                  {getTypeBadge(email.email_type)}
                </div>

                {/* Status */}
                <div className="flex items-center justify-center">
                  {getStatusBadge(email.status)}
                </div>

                {/* Opens */}
                <div className="text-center">
                  {email.open_count > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3 text-green-400" />
                      <span className="text-xs text-[var(--text-primary)]">{email.open_count}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">-</span>
                  )}
                </div>

                {/* Clicks */}
                <div className="text-center">
                  {email.click_count > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <MousePointerClick className="h-3 w-3 text-blue-400" />
                      <span className="text-xs text-[var(--text-primary)]">{email.click_count}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--text-muted)]">-</span>
                  )}
                </div>

                {/* Sent Date */}
                <div className="text-[10px] text-[var(--text-muted)]">
                  {formatDateCompact(email.sent_at)}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)]">
            <p className="text-[10px] text-[var(--text-muted)] font-mono">
              {emailLogs.length} of {pagination?.total || emailLogs.length} emails
            </p>
          </div>
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="py-4 flex items-center justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading more...</span>
          </div>
        )}
        {!loadingMore && pagination?.hasMore && (
          <Button variant="ghost" size="sm" onClick={loadMore}>
            Load More
          </Button>
        )}
        {!pagination?.hasMore && emailLogs.length > 0 && (
          <p className="text-xs text-secondary">
            All {pagination?.total || emailLogs.length} emails loaded
          </p>
        )}
      </div>

      {/* Email Detail Modal */}
      <Modal
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
        title="Email Details"
        size="lg"
      >
        {selectedEmail && (
          <div className="space-y-4">
            {/* Email Info */}
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Recipient</p>
                <p className="text-sm text-primary">{selectedEmail.recipient}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Subject</p>
                <p className="text-sm text-primary">{selectedEmail.subject}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Status</p>
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Type</p>
                  {getTypeBadge(selectedEmail.email_type)}
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Sent</p>
                  <p className="text-xs text-primary">{formatDate(selectedEmail.sent_at)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">Template</p>
                  <p className="text-xs text-primary">{selectedEmail.template_slug || "-"}</p>
                </div>
              </div>
              {selectedEmail.bounced_at && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Bounced</p>
                  <p className="text-xs text-red-400">{selectedEmail.bounce_reason || "Email bounced"}</p>
                  <p className="text-[10px] text-secondary mt-1">{formatDate(selectedEmail.bounced_at)}</p>
                </div>
              )}
              {selectedEmail.error_message && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Error</p>
                  <p className="text-xs text-red-400">{selectedEmail.error_message}</p>
                </div>
              )}
            </div>

            {/* Engagement Stats */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Engagement</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-primary">Opens</span>
                  </div>
                  <p className="text-lg font-bold text-green-400">{selectedEmail.open_count || 0}</p>
                  {selectedEmail.last_opened_at && (
                    <p className="text-[10px] text-secondary mt-1">Last: {formatDate(selectedEmail.last_opened_at)}</p>
                  )}
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointerClick className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-medium text-primary">Clicks</span>
                  </div>
                  <p className="text-lg font-bold text-blue-400">{selectedEmail.click_count || 0}</p>
                  {selectedEmail.last_clicked_at && (
                    <p className="text-[10px] text-secondary mt-1">Last: {formatDate(selectedEmail.last_clicked_at)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">Metadata</p>
                <pre className="text-xs text-secondary bg-[var(--bg-void)] p-3 rounded-lg overflow-auto max-h-40">
                  {JSON.stringify(selectedEmail.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
