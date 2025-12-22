"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, LoadingSpinner, Select } from "@crowdstack/ui";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Filter, Download } from "lucide-react";

interface XPLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  source_type: string;
  role_context: string;
  event_id: string | null;
  related_id: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
  user?: {
    id: string;
    email: string;
  } | null;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Summary {
  totalXP: number;
  positiveXP: number;
  negativeXP: number;
  entryCount: number;
}

export default function XPLedgerPage() {
  const [entries, setEntries] = useState<XPLedgerEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    userId: "",
    eventId: "",
    sourceType: "",
    roleContext: "",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    hasMore: false,
  });

  useEffect(() => {
    loadEntries();
  }, [filters, pagination.offset]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });
      
      if (filters.userId) params.set("user_id", filters.userId);
      if (filters.eventId) params.set("event_id", filters.eventId);
      if (filters.sourceType) params.set("source_type", filters.sourceType);
      if (filters.roleContext) params.set("role_context", filters.roleContext);
      
      const response = await fetch(`/api/admin/xp-ledger?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load XP ledger");
      
      const data = await response.json();
      setEntries(data.entries || []);
      setSummary(data.summary || null);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        hasMore: data.pagination?.hasMore || false,
      }));
    } catch (error) {
      console.error("Error loading XP ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.user?.email?.toLowerCase().includes(searchLower) ||
      entry.event?.name?.toLowerCase().includes(searchLower) ||
      entry.description?.toLowerCase().includes(searchLower) ||
      entry.source_type?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportCSV = () => {
    const headers = ["Date", "User Email", "Amount", "Source Type", "Role Context", "Event", "Description"];
    const rows = filteredEntries.map((e) => [
      formatDate(e.created_at),
      e.user?.email || "N/A",
      e.amount.toString(),
      e.source_type,
      e.role_context,
      e.event?.name || "N/A",
      e.description || "",
    ]);
    
    const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xp-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Link>
              <h1 className="text-3xl font-bold text-foreground">XP Ledger</h1>
              <p className="mt-2 text-sm text-foreground-muted">
                View and analyze XP transactions
              </p>
            </div>
            <Button onClick={exportCSV} variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <div className="p-4">
                  <div className="text-sm text-foreground-muted mb-1">Total XP</div>
                  <div className="text-2xl font-bold text-foreground">{summary.totalXP.toLocaleString()}</div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-foreground-muted mb-1 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Positive XP
                  </div>
                  <div className="text-2xl font-bold text-green-500">{summary.positiveXP.toLocaleString()}</div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-foreground-muted mb-1 flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Negative XP
                  </div>
                  <div className="text-2xl font-bold text-red-500">{summary.negativeXP.toLocaleString()}</div>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <div className="text-sm text-foreground-muted mb-1">Total Entries</div>
                  <div className="text-2xl font-bold text-foreground">{summary.entryCount.toLocaleString()}</div>
                </div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Search by email, event, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:col-span-2"
                />
                <Input
                  placeholder="User ID"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                />
                <Input
                  placeholder="Event ID"
                  value={filters.eventId}
                  onChange={(e) => setFilters({ ...filters, eventId: e.target.value })}
                />
                <Select
                  value={filters.sourceType}
                  onChange={(e) => setFilters({ ...filters, sourceType: e.target.value })}
                >
                  <option value="">All Source Types</option>
                  <option value="ATTENDED_EVENT">Attended Event</option>
                  <option value="EARLY_REGISTRATION">Early Registration</option>
                  <option value="PROMOTER_REFERRAL_REGISTRATION">Promoter Referral Registration</option>
                  <option value="PROMOTER_REFERRAL_CHECKIN">Promoter Referral Check-in</option>
                  <option value="USER_REFERRAL_REGISTRATION">User Referral Registration</option>
                  <option value="USER_REFERRAL_CLICK">User Referral Click</option>
                  <option value="NO_SHOW_PENALTY">No Show Penalty</option>
                </Select>
                <Select
                  value={filters.roleContext}
                  onChange={(e) => setFilters({ ...filters, roleContext: e.target.value })}
                >
                  <option value="">All Roles</option>
                  <option value="attendee">Attendee</option>
                  <option value="promoter">Promoter</option>
                  <option value="organizer">Organizer</option>
                  <option value="venue">Venue</option>
                </Select>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    setFilters({ userId: "", eventId: "", sourceType: "", roleContext: "" });
                    setSearch("");
                    setPagination(prev => ({ ...prev, offset: 0 }));
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Clear Filters
                </Button>
                <Button onClick={loadEntries} variant="primary" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-4 text-sm text-foreground-muted">
            Showing {filteredEntries.length} of {pagination.total} entries
          </div>

          <Card>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner text="Loading XP ledger..." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source Type</TableHead>
                      <TableHead>Role Context</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-foreground-muted py-8">
                          No XP ledger entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {formatDate(entry.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {entry.user?.email || "N/A"}
                            </div>
                            {entry.user_id && (
                              <div className="text-xs text-foreground-muted font-mono">
                                {entry.user_id.slice(0, 8)}...
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.amount >= 0 ? "success" : "error"}
                              className="font-mono"
                            >
                              {entry.amount >= 0 ? "+" : ""}{entry.amount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">{entry.source_type}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="primary">{entry.role_context}</Badge>
                          </TableCell>
                          <TableCell>
                            {entry.event ? (
                              <Link
                                href={`/admin/events/${entry.event.id}`}
                                className="text-sm text-primary hover:underline"
                              >
                                {entry.event.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-foreground-muted">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {entry.description || "—"}
                          </TableCell>
                          <TableCell>
                            {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-foreground-muted hover:text-foreground">
                                  View
                                </summary>
                                <pre className="mt-2 p-2 bg-surface rounded text-xs overflow-auto max-w-xs">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className="text-sm text-foreground-muted">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>

          {/* Pagination */}
          {!loading && pagination.total > pagination.limit && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-foreground-muted">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={pagination.offset === 0}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!pagination.hasMore}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
}

