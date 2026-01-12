"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Input, Badge, InlineSpinner } from "@crowdstack/ui";
import { Mail, Search, Filter, Loader2, ExternalLink, Eye, MousePointerClick, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface EmailLog {
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
  email_templates?: {
    id: string;
    slug: string;
    category: string;
  } | null;
}

interface EmailStats {
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

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emailTypeFilter, setEmailTypeFilter] = useState("");
  const [templateSlugFilter, setTemplateSlugFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when filters change
  useEffect(() => {
    setEmails([]);
    setPagination(null);
    setLoading(true);
    loadEmails(1);
  }, [debouncedSearch, statusFilter, emailTypeFilter, templateSlugFilter, startDate, endDate]);

  const loadEmails = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      if (emailTypeFilter) {
        params.set("emailType", emailTypeFilter);
      }
      if (templateSlugFilter) {
        params.set("templateSlug", templateSlugFilter);
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const response = await fetch(`/api/admin/emails?${params}`);
      if (!response.ok) throw new Error("Failed to load emails");
      const data = await response.json();

      if (page === 1) {
        setEmails(data.emails || []);
        setStats(data.stats);
      } else {
        setEmails(prev => [...prev, ...(data.emails || [])]);
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

  // Set up intersection observer for infinite scroll
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

  const getEmailTypeBadge = (emailType: string) => {
    const colors: Record<string, string> = {
      template: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      contact_form: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      magic_link: "bg-green-500/20 text-green-400 border-green-500/30",
      direct: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      system: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    const color = colors[emailType] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
        {emailType}
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
            Email Logs
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Complete log of all emails sent by the platform
          </p>
        </div>
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
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Sent</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalSent}</p>
          </div>
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Open Rate</p>
            <p className="text-2xl font-bold text-green-400">{stats.openRate.toFixed(1)}%</p>
          </div>
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Click Rate</p>
            <p className="text-2xl font-bold text-blue-400">{stats.clickRate.toFixed(1)}%</p>
          </div>
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Bounce Rate</p>
            <p className="text-2xl font-bold text-red-400">{stats.bounceRate.toFixed(1)}%</p>
          </div>
          <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Today</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.todayCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-void)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Email Type</label>
              <select
                value={emailTypeFilter}
                onChange={(e) => setEmailTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-void)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
              >
                <option value="">All Types</option>
                <option value="template">Template</option>
                <option value="contact_form">Contact Form</option>
                <option value="magic_link">Magic Link</option>
                <option value="direct">Direct</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Template Slug</label>
              <Input
                value={templateSlugFilter}
                onChange={(e) => setTemplateSlugFilter(e.target.value)}
                placeholder="Filter by template..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl p-3">
        <Input
          placeholder="Search by recipient or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Results Count */}
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Showing {emails.length} of {pagination?.total || 0} emails
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </div>

      {/* Emails Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <InlineSpinner size="lg" />
          <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading emails...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No emails found</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-void)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Recipient
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Subject
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Type
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Status
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Sent
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Opens
                  </th>
                  <th className="text-left p-3 text-xs font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    Clicks
                  </th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr
                    key={email.id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-void)] transition-colors"
                  >
                    <td className="p-3">
                      <div className="text-sm text-[var(--text-primary)]">{email.recipient}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-[var(--text-primary)] max-w-xs truncate">
                        {email.subject}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getEmailTypeBadge(email.email_type)}
                        {email.template_id && email.email_templates && (
                          <Link
                            href={`/admin/communications/${email.template_id}`}
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            {email.template_slug}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {getStatusBadge(email.status)}
                      {email.bounced_at && (
                        <div className="text-[10px] text-red-400 mt-1">
                          {email.bounce_reason || "Bounced"}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-[var(--text-secondary)]">
                        {formatDate(email.sent_at)}
                      </div>
                    </td>
                    <td className="p-3">
                      {email.open_count > 0 ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Eye className="h-3 w-3 text-green-400" />
                          <span className="text-[var(--text-primary)]">{email.open_count}</span>
                          {email.last_opened_at && (
                            <span className="text-[var(--text-muted)]">
                              ({formatDate(email.last_opened_at)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {email.click_count > 0 ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MousePointerClick className="h-3 w-3 text-blue-400" />
                          <span className="text-[var(--text-primary)]">{email.click_count}</span>
                          {email.last_clicked_at && (
                            <span className="text-[var(--text-muted)]">
                              ({formatDate(email.last_clicked_at)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div
        ref={loadMoreRef}
        className="py-4 flex items-center justify-center"
      >
        {loadingMore && (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading more...</span>
          </div>
        )}
        {!loadingMore && pagination?.hasMore && (
          <Button variant="ghost" size="sm" onClick={loadMore}>
            Load More
          </Button>
        )}
        {!pagination?.hasMore && emails.length > 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            All {pagination?.total || emails.length} emails loaded
          </p>
        )}
      </div>
    </div>
  );
}
