"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, LoadingSpinner, Badge, EmptyState, Tabs, TabsList, TabsTrigger, TabsContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Input } from "@crowdstack/ui";
import { Plus, Mail, Edit, ToggleLeft, ToggleRight, BarChart3, Calendar, Filter, Download } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"templates" | "stats">("templates");
  
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

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === "stats") {
      loadStats();
    }
  }, [activeTab, groupBy, templateFilter, dateRange]);

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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "templates" | "stats")}>
        <TabsList>
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Stats & Logs
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

            {/* Recent Logs */}
            <Card>
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Recent Email Logs</h2>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              {loadingStats ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner text="Loading logs..." />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-secondary">
                  No email logs found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-secondary">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {log.template_slug}
                          </TableCell>
                          <TableCell className="text-sm">{log.recipient}</TableCell>
                          <TableCell className="text-sm text-secondary truncate max-w-xs">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            {log.status === "sent" ? (
                              <Badge variant="success">Sent</Badge>
                            ) : log.status === "failed" ? (
                              <Badge variant="error">Failed</Badge>
                            ) : (
                              <Badge variant="warning">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.opened_at ? (
                              <span className="text-sm text-accent-success">
                                {new Date(log.opened_at).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-secondary">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.clicked_at ? (
                              <span className="text-sm text-accent-success">
                                {new Date(log.clicked_at).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-sm text-secondary">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

