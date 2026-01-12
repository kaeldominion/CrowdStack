"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, LoadingSpinner, Badge, EmptyState, Tabs, TabsList, TabsTrigger, TabsContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input, InlineSpinner } from "@crowdstack/ui";
import { Plus, Mail, Edit, ToggleLeft, ToggleRight, BarChart3, Calendar, Filter, Download, Search, ExternalLink, Eye, MousePointerClick, Loader2 } from "lucide-react";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  slug: string;
  trigger: string;
  category: string;
  subject: string;
  enabled: boolean;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    open_rate: number;
    click_rate: number;
  };
}

const categoryLabels: Record<string, string> = {
  auth_onboarding: "Auth & Onboarding",
  event_lifecycle: "Event Lifecycle",
  payout: "Payout",
  bonus: "Bonus",
  guest: "Guest",
  venue: "Venue",
  system: "System",
};

interface EmailLog {
  id: string;
  template_slug: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface EmailStats {
  overall: {
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_failed: number;
    open_rate: number;
    click_rate: number;
  };
  grouped: {
    by_template: Array<{
      template_slug: string;
      sent: number;
      opened: number;
      clicked: number;
      failed: number;
      open_rate: number;
      click_rate: number;
    }>;
    by_date: Array<{
      date: string;
      sent: number;
      opened: number;
      clicked: number;
      failed: number;
      open_rate: number;
      click_rate: number;
    }>;
    by_status: {
      sent: number;
      failed: number;
      pending: number;
    };
    by_category: Array<{
      category: string;
      sent: number;
      opened: number;
      clicked: number;
      failed: number;
      open_rate: number;
      click_rate: number;
    }>;
  };
}

export default function AdminCommunicationsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "stats" | "logs">("templates");
  
  // Stats state
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [groupBy, setGroupBy] = useState<"template" | "date" | "status" | "category">("template");
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Email Logs state (from /admin/emails implementation)
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
    email_templates?: {
      id: string;
      slug: string;
      category: string;
    } | null;
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

  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);
  const [loadingMoreEmailLogs, setLoadingMoreEmailLogs] = useState(false);
  const [emailLogsSearch, setEmailLogsSearch] = useState("");
  const [debouncedEmailLogsSearch, setDebouncedEmailLogsSearch] = useState("");
  const [emailLogsStatusFilter, setEmailLogsStatusFilter] = useState("");
  const [emailLogsTypeFilter, setEmailLogsTypeFilter] = useState("");
  const [emailLogsTemplateFilter, setEmailLogsTemplateFilter] = useState("");
  const [emailLogsStartDate, setEmailLogsStartDate] = useState("");
  const [emailLogsEndDate, setEmailLogsEndDate] = useState("");
  const [emailLogsPagination, setEmailLogsPagination] = useState<Pagination | null>(null);
  const [emailLogsStats, setEmailLogsStats] = useState<EmailLogsStats | null>(null);
  const [showEmailLogsFilters, setShowEmailLogsFilters] = useState(false);
  const emailLogsObserverRef = useRef<IntersectionObserver | null>(null);
  const emailLogsLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === "stats") {
      loadStats();
    }
  }, [activeTab, groupBy, templateFilter, dateRange]);

  // Debounce email logs search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmailLogsSearch(emailLogsSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [emailLogsSearch]);

  // Reset and load email logs when filters change
  useEffect(() => {
    if (activeTab === "logs") {
      setEmailLogs([]);
      setEmailLogsPagination(null);
      setLoadingEmailLogs(true);
      loadEmailLogs(1);
    }
  }, [activeTab, debouncedEmailLogsSearch, emailLogsStatusFilter, emailLogsTypeFilter, emailLogsTemplateFilter, emailLogsStartDate, emailLogsEndDate]);

  const loadEmailLogs = async (page: number = 1) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (debouncedEmailLogsSearch) {
        params.set("search", debouncedEmailLogsSearch);
      }
      if (emailLogsStatusFilter) {
        params.set("status", emailLogsStatusFilter);
      }
      if (emailLogsTypeFilter) {
        params.set("emailType", emailLogsTypeFilter);
      }
      if (emailLogsTemplateFilter) {
        params.set("templateSlug", emailLogsTemplateFilter);
      }
      if (emailLogsStartDate) {
        params.set("startDate", emailLogsStartDate);
      }
      if (emailLogsEndDate) {
        params.set("endDate", emailLogsEndDate);
      }

      const response = await fetch(`/api/admin/emails?${params}`);
      if (!response.ok) throw new Error("Failed to load emails");
      const data = await response.json();

      if (page === 1) {
        setEmailLogs(data.emails || []);
        setEmailLogsStats(data.stats);
      } else {
        setEmailLogs(prev => [...prev, ...(data.emails || [])]);
      }
      setEmailLogsPagination(data.pagination);
    } catch (error) {
      console.error("Error loading email logs:", error);
    } finally {
      setLoadingEmailLogs(false);
      setLoadingMoreEmailLogs(false);
    }
  };

  const loadMoreEmailLogs = useCallback(() => {
    if (loadingMoreEmailLogs || !emailLogsPagination?.hasMore) return;
    setLoadingMoreEmailLogs(true);
    loadEmailLogs(emailLogsPagination.page + 1);
  }, [loadingMoreEmailLogs, emailLogsPagination]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (emailLogsObserverRef.current) {
      emailLogsObserverRef.current.disconnect();
    }

    emailLogsObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && emailLogsPagination?.hasMore && !loadingMoreEmailLogs) {
          loadMoreEmailLogs();
        }
      },
      { threshold: 0.1 }
    );

    if (emailLogsLoadMoreRef.current) {
      emailLogsObserverRef.current.observe(emailLogsLoadMoreRef.current);
    }

    return () => {
      if (emailLogsObserverRef.current) {
        emailLogsObserverRef.current.disconnect();
      }
    };
  }, [emailLogsPagination, loadingMoreEmailLogs, loadMoreEmailLogs]);

  const getEmailLogStatusBadge = (status: string) => {
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

  const getEmailLogTypeBadge = (emailType: string) => {
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

  const formatEmailLogDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/email-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (templateId: string, currentEnabled: boolean) => {
    setToggling(templateId);
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error("Failed to toggle template:", error);
    } finally {
      setToggling(null);
    }
  };

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const params = new URLSearchParams({
        groupBy,
        limit: "100",
      });

      if (templateFilter) {
        params.append("template", templateFilter);
      }
      if (dateRange.start) {
        params.append("startDate", dateRange.start);
      }
      if (dateRange.end) {
        params.append("endDate", dateRange.end);
      }

      const response = await fetch(`/api/admin/email-templates/stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading email templates..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Email Communications</h1>
          <p className="text-sm text-secondary mt-1">
            Manage email templates and view send statistics
          </p>
        </div>
        {activeTab === "templates" && (
          <Button variant="primary" onClick={() => router.push("/admin/communications/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "templates" | "stats" | "logs")}>
        <TabsList>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Mail className="h-4 w-4 mr-2" />
            Email Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">

          {templates.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-12 w-12" />}
              title="No Email Templates"
              description="Create your first email template to get started."
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                <Card key={category}>
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-border-subtle">
                      <h2 className="text-lg font-semibold text-primary">
                        {categoryLabels[category] || category}
                      </h2>
                      <p className="text-xs text-secondary mt-1">
                        {categoryTemplates.length} template
                        {categoryTemplates.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {categoryTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-active/50 border border-border-subtle"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-primary">
                                {template.slug}
                              </div>
                              {template.enabled ? (
                                <Badge variant="success">Enabled</Badge>
                              ) : (
                                <Badge variant="default">Disabled</Badge>
                              )}
                            </div>
                            <div className="text-sm text-secondary mt-1">
                              {template.subject}
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              Trigger: {template.trigger}
                            </div>
                            {template.stats && template.stats.sent > 0 && (
                              <div className="text-xs text-secondary mt-2">
                                Sent: {template.stats.sent} • Open:{" "}
                                {template.stats.open_rate.toFixed(1)}% • Click:{" "}
                                {template.stats.click_rate.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleToggle(template.id, template.enabled)
                              }
                              disabled={toggling === template.id}
                              className="text-secondary hover:text-primary transition-colors"
                            >
                              {template.enabled ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                            <Link href={`/admin/communications/${template.id}`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="!p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2">
                    Group By
                  </label>
                  <select
                    value={groupBy}
                    onChange={(e) =>
                      setGroupBy(
                        e.target.value as "template" | "date" | "status" | "category"
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-raised border border-border-subtle text-sm text-primary focus:outline-none focus:border-accent-primary/50"
                  >
                    <option value="template">By Template</option>
                    <option value="date">By Date</option>
                    <option value="status">By Status</option>
                    <option value="category">By Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2">
                    Template Filter
                  </label>
                  <select
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-raised border border-border-subtle text-sm text-primary focus:outline-none focus:border-accent-primary/50"
                  >
                    <option value="">All Templates</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.slug}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end: e.target.value })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Overall Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="!p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Total Sent
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.overall.total_sent}
                  </p>
                </Card>
                <Card className="!p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Open Rate
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.overall.open_rate.toFixed(1)}%
                  </p>
                </Card>
                <Card className="!p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Click Rate
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {stats.overall.click_rate.toFixed(1)}%
                  </p>
                </Card>
                <Card className="!p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Failed
                  </p>
                  <p className="text-2xl font-bold text-accent-error">
                    {stats.overall.total_failed}
                  </p>
                </Card>
              </div>
            )}

            {/* Grouped Stats Table */}
            {loadingStats ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner text="Loading stats..." />
              </div>
            ) : stats ? (
              <Card className="!p-0 overflow-hidden">
                <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">
                    {groupBy === "template"
                      ? "By Template"
                      : groupBy === "date"
                        ? "By Date"
                        : groupBy === "status"
                          ? "By Status"
                          : "By Category"}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {groupBy === "template" && (
                          <>
                            <TableHead>Template</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead>Clicked</TableHead>
                            <TableHead>Failed</TableHead>
                            <TableHead>Open Rate</TableHead>
                            <TableHead>Click Rate</TableHead>
                          </>
                        )}
                        {groupBy === "date" && (
                          <>
                            <TableHead>Date</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead>Clicked</TableHead>
                            <TableHead>Failed</TableHead>
                            <TableHead>Open Rate</TableHead>
                            <TableHead>Click Rate</TableHead>
                          </>
                        )}
                        {groupBy === "status" && (
                          <>
                            <TableHead>Status</TableHead>
                            <TableHead>Count</TableHead>
                          </>
                        )}
                        {groupBy === "category" && (
                          <>
                            <TableHead>Category</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead>Clicked</TableHead>
                            <TableHead>Failed</TableHead>
                            <TableHead>Open Rate</TableHead>
                            <TableHead>Click Rate</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupBy === "template" &&
                        stats.grouped.by_template.map((item) => (
                          <TableRow key={item.template_slug}>
                            <TableCell className="font-medium">
                              {item.template_slug}
                            </TableCell>
                            <TableCell>{item.sent}</TableCell>
                            <TableCell>{item.opened}</TableCell>
                            <TableCell>{item.clicked}</TableCell>
                            <TableCell>
                              {item.failed > 0 ? (
                                <span className="text-accent-error">{item.failed}</span>
                              ) : (
                                item.failed
                              )}
                            </TableCell>
                            <TableCell>
                              {item.open_rate.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {item.click_rate.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      {groupBy === "date" &&
                        stats.grouped.by_date.map((item) => (
                          <TableRow key={item.date}>
                            <TableCell className="font-medium">
                              {new Date(item.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{item.sent}</TableCell>
                            <TableCell>{item.opened}</TableCell>
                            <TableCell>{item.clicked}</TableCell>
                            <TableCell>
                              {item.failed > 0 ? (
                                <span className="text-accent-error">{item.failed}</span>
                              ) : (
                                item.failed
                              )}
                            </TableCell>
                            <TableCell>
                              {item.open_rate.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {item.click_rate.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      {groupBy === "status" && (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">Sent</TableCell>
                            <TableCell>{stats.grouped.by_status.sent}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Failed</TableCell>
                            <TableCell className="text-accent-error">
                              {stats.grouped.by_status.failed}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Pending</TableCell>
                            <TableCell>{stats.grouped.by_status.pending}</TableCell>
                          </TableRow>
                        </>
                      )}
                      {groupBy === "category" &&
                        stats.grouped.by_category.map((item) => (
                          <TableRow key={item.category}>
                            <TableCell className="font-medium">
                              {categoryLabels[item.category] || item.category}
                            </TableCell>
                            <TableCell>{item.sent}</TableCell>
                            <TableCell>{item.opened}</TableCell>
                            <TableCell>{item.clicked}</TableCell>
                            <TableCell>
                              {item.failed > 0 ? (
                                <span className="text-accent-error">{item.failed}</span>
                              ) : (
                                item.failed
                              )}
                            </TableCell>
                            <TableCell>
                              {item.open_rate.toFixed(1)}%
                            </TableCell>
                            <TableCell>
                              {item.click_rate.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : null}

          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-primary">
                  Email Logs
                </h2>
                <p className="mt-1 text-xs text-secondary">
                  Complete log of all emails sent by the platform
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEmailLogsFilters(!showEmailLogsFilters)}
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            {emailLogsStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="!p-3">
                  <p className="text-xs text-secondary mb-1">Total Sent</p>
                  <p className="text-2xl font-bold text-primary">{emailLogsStats.totalSent}</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-xs text-secondary mb-1">Open Rate</p>
                  <p className="text-2xl font-bold text-green-400">{emailLogsStats.openRate.toFixed(1)}%</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-xs text-secondary mb-1">Click Rate</p>
                  <p className="text-2xl font-bold text-blue-400">{emailLogsStats.clickRate.toFixed(1)}%</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-xs text-secondary mb-1">Bounce Rate</p>
                  <p className="text-2xl font-bold text-red-400">{emailLogsStats.bounceRate.toFixed(1)}%</p>
                </Card>
                <Card className="!p-3">
                  <p className="text-xs text-secondary mb-1">Today</p>
                  <p className="text-2xl font-bold text-primary">{emailLogsStats.todayCount}</p>
                </Card>
              </div>
            )}

            {/* Filters */}
            {showEmailLogsFilters && (
              <Card className="!p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-secondary mb-1 block">Status</label>
                    <select
                      value={emailLogsStatusFilter}
                      onChange={(e) => setEmailLogsStatusFilter(e.target.value)}
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
                      value={emailLogsTypeFilter}
                      onChange={(e) => setEmailLogsTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-raised border border-border-subtle text-sm text-primary"
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
                    <label className="text-xs text-secondary mb-1 block">Template Slug</label>
                    <Input
                      value={emailLogsTemplateFilter}
                      onChange={(e) => setEmailLogsTemplateFilter(e.target.value)}
                      placeholder="Filter by template..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={emailLogsStartDate}
                      onChange={(e) => setEmailLogsStartDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary mb-1 block">End Date</label>
                    <Input
                      type="date"
                      value={emailLogsEndDate}
                      onChange={(e) => setEmailLogsEndDate(e.target.value)}
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
                value={emailLogsSearch}
                onChange={(e) => setEmailLogsSearch(e.target.value)}
                className="h-8 text-sm"
              />
            </Card>

            {/* Results Count */}
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {emailLogs.length} of {emailLogsPagination?.total || 0} emails
              {debouncedEmailLogsSearch && ` matching "${debouncedEmailLogsSearch}"`}
            </div>

            {/* Emails Table */}
            {loadingEmailLogs ? (
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
              <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Recipient</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Subject</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Type</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Sent</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Opens</TableHead>
                        <TableHead className="text-xs font-mono font-bold uppercase tracking-widest">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell>
                            <div className="text-sm text-primary">{email.recipient}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-primary max-w-xs truncate">
                              {email.subject}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEmailLogTypeBadge(email.email_type)}
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
                          </TableCell>
                          <TableCell>
                            {getEmailLogStatusBadge(email.status)}
                            {email.bounced_at && (
                              <div className="text-[10px] text-red-400 mt-1">
                                {email.bounce_reason || "Bounced"}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-secondary">
                              {formatEmailLogDate(email.sent_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {email.open_count > 0 ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Eye className="h-3 w-3 text-green-400" />
                                <span className="text-primary">{email.open_count}</span>
                                {email.last_opened_at && (
                                  <span className="text-secondary">
                                    ({formatEmailLogDate(email.last_opened_at)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-secondary">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {email.click_count > 0 ? (
                              <div className="flex items-center gap-1 text-xs">
                                <MousePointerClick className="h-3 w-3 text-blue-400" />
                                <span className="text-primary">{email.click_count}</span>
                                {email.last_clicked_at && (
                                  <span className="text-secondary">
                                    ({formatEmailLogDate(email.last_clicked_at)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-secondary">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}

            {/* Infinite Scroll Trigger */}
            <div
              ref={emailLogsLoadMoreRef}
              className="py-4 flex items-center justify-center"
            >
              {loadingMoreEmailLogs && (
                <div className="flex items-center gap-2 text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading more...</span>
                </div>
              )}
              {!loadingMoreEmailLogs && emailLogsPagination?.hasMore && (
                <Button variant="ghost" size="sm" onClick={loadMoreEmailLogs}>
                  Load More
                </Button>
              )}
              {!emailLogsPagination?.hasMore && emailLogs.length > 0 && (
                <p className="text-xs text-secondary">
                  All {emailLogsPagination?.total || emailLogs.length} emails loaded
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

