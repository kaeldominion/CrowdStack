"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Tabs, TabsList, TabsTrigger, TabsContent } from "@crowdstack/ui";
import { Download, Calendar, TrendingUp, Users, DollarSign, Megaphone, FileText, BarChart3, ExternalLink } from "lucide-react";
import { RegistrationChart } from "@/components/charts/RegistrationChart";
import Link from "next/link";

type ReportType = "event_performance" | "promoter_performance" | "payouts" | "attendee_analytics";

interface EventPerformanceData {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  capacity: number | null;
  venue: { id: string; name: string } | null;
  registrations: number;
  checkins: number;
  conversionRate: number;
  promoters: number;
}

interface PromoterPerformanceData {
  id: string;
  name: string;
  email: string | null;
  events: number;
  registrations: number;
  checkins: number;
  conversionRate: number;
  earnings: number;
  paidEarnings: number;
  pendingEarnings: number;
}

interface PayoutData {
  id: string;
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    currency: string;
  };
  generated_at: string;
  statement_pdf_path: string | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  promoterCount: number;
  lineCount: number;
}

interface AttendeeAnalyticsData {
  totalAttendees: number;
  bySource: {
    direct: number;
    promoter: number;
    userReferral: number;
  };
  trends: Array<{ month: string; registrations: number; checkins: number }>;
}

export default function OrganizerReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("event_performance");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Data states
  const [eventPerformance, setEventPerformance] = useState<{
    events: EventPerformanceData[];
    summary: { totalEvents: number; totalRegistrations: number; totalCheckins: number; avgConversionRate: number; totalPromoters: number } | null;
  } | null>(null);
  const [promoterPerformance, setPromoterPerformance] = useState<{ promoters: PromoterPerformanceData[] } | null>(null);
  const [payouts, setPayouts] = useState<{
    payouts: PayoutData[];
    summary: { totalPayouts: number; totalAmount: number; totalPaid: number; totalPending: number } | null;
  } | null>(null);
  const [attendeeAnalytics, setAttendeeAnalytics] = useState<AttendeeAnalyticsData | null>(null);

  useEffect(() => {
    loadReport();
  }, [activeReport, startDate, endDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeReport,
      });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/organizer/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        
        switch (activeReport) {
          case "event_performance":
            setEventPerformance(data);
            break;
          case "promoter_performance":
            setPromoterPerformance(data);
            break;
          case "payouts":
            setPayouts(data);
            break;
          case "attendee_analytics":
            setAttendeeAnalytics(data);
            break;
        }
      }
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    let csvContent = "";
    let filename = "";

    switch (activeReport) {
      case "event_performance": {
        if (!eventPerformance?.events) return;
        const headers = ["Event Name", "Date", "Venue", "Registrations", "Check-ins", "Conversion Rate", "Promoters", "Status"];
        const rows = eventPerformance.events.map(e => [
          e.name,
          new Date(e.start_time).toLocaleDateString(),
          e.venue?.name || "N/A",
          e.registrations.toString(),
          e.checkins.toString(),
          `${e.conversionRate}%`,
          e.promoters.toString(),
          e.status,
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `organizer-event-performance-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "promoter_performance": {
        if (!promoterPerformance?.promoters) return;
        const headers = ["Promoter", "Events", "Registrations", "Check-ins", "Conversion Rate", "Total Earnings", "Paid", "Pending"];
        const rows = promoterPerformance.promoters.map(p => [
          p.name,
          p.events.toString(),
          p.registrations.toString(),
          p.checkins.toString(),
          `${p.conversionRate}%`,
          p.earnings.toFixed(2),
          p.paidEarnings.toFixed(2),
          p.pendingEarnings.toFixed(2),
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `organizer-promoter-performance-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "payouts": {
        if (!payouts?.payouts) return;
        const headers = ["Event", "Date", "Currency", "Total Amount", "Paid", "Pending", "Promoters", "Generated"];
        const rows = payouts.payouts.map(p => [
          p.event.name,
          new Date(p.event.start_time).toLocaleDateString(),
          p.event.currency,
          p.totalAmount.toFixed(2),
          p.paidAmount.toFixed(2),
          p.pendingAmount.toFixed(2),
          p.promoterCount.toString(),
          new Date(p.generated_at).toLocaleDateString(),
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `organizer-payouts-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "attendee_analytics": {
        if (!attendeeAnalytics) return;
        const headers = ["Month", "Registrations", "Check-ins"];
        const rows = attendeeAnalytics.trends.map(t => [
          t.month,
          t.registrations.toString(),
          t.checkins.toString(),
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `organizer-attendee-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Reports</h1>
          <p className="text-sm text-secondary">
            Analytics and insights for your events
          </p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={loading}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Filters */}
      <Card>
        <div className="p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary" />
            <span className="text-sm text-secondary">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-glass text-primary text-sm"
            />
            <span className="text-sm text-secondary">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-glass text-primary text-sm"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-secondary hover:text-primary"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={(v) => setActiveReport(v as ReportType)}>
        <TabsList>
          <TabsTrigger value="event_performance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Event Performance
          </TabsTrigger>
          <TabsTrigger value="promoter_performance">
            <Megaphone className="h-4 w-4 mr-2" />
            Promoter Performance
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <DollarSign className="h-4 w-4 mr-2" />
            Payouts
          </TabsTrigger>
          <TabsTrigger value="attendee_analytics">
            <Users className="h-4 w-4 mr-2" />
            Attendee Analytics
          </TabsTrigger>
        </TabsList>

        {/* Event Performance Report */}
        <TabsContent value="event_performance" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : eventPerformance?.events && eventPerformance.events.length > 0 ? (
            <>
              {/* Summary Cards */}
              {eventPerformance.summary && (
                <div className="grid grid-cols-5 gap-2">
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Events</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{eventPerformance.summary.totalEvents}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Registrations</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{eventPerformance.summary.totalRegistrations}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Check-ins</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{eventPerformance.summary.totalCheckins}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Avg. Conversion</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{eventPerformance.summary.avgConversionRate}%</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Promoters</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{eventPerformance.summary.totalPromoters}</p>
                  </Card>
                </div>
              )}

              {/* Events Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Registrations</TableHead>
                      <TableHead>Check-ins</TableHead>
                      <TableHead>Conversion</TableHead>
                      <TableHead>Promoters</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventPerformance.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-sans font-semibold text-primary">{event.name}</div>
                          <div className="text-xs text-secondary mt-0.5">{event.slug}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-secondary">
                            {new Date(event.start_time).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{event.venue?.name || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{event.registrations}</div>
                          {event.capacity && (
                            <div className="text-xs text-secondary">/ {event.capacity}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{event.checkins}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`text-sm font-medium ${
                            event.conversionRate >= 70 ? "text-accent-success" :
                            event.conversionRate >= 40 ? "text-accent-warning" :
                            "text-secondary"
                          }`}>
                            {event.conversionRate}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{event.promoters}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            event.status === "published" ? "success" :
                            event.status === "draft" ? "secondary" :
                            "danger"
                          }>
                            {event.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Event Data</h3>
                <p className="text-sm text-secondary">
                  No events found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Promoter Performance Report */}
        <TabsContent value="promoter_performance" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : promoterPerformance?.promoters && promoterPerformance.promoters.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promoter</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoterPerformance.promoters.map((promoter) => (
                    <TableRow key={promoter.id}>
                      <TableCell>
                        <div className="font-sans font-semibold text-primary">{promoter.name}</div>
                        {promoter.email && (
                          <div className="text-xs text-secondary mt-0.5">{promoter.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{promoter.events}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{promoter.registrations}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{promoter.checkins}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          promoter.conversionRate >= 70 ? "text-accent-success" :
                          promoter.conversionRate >= 40 ? "text-accent-warning" :
                          "text-secondary"
                        }`}>
                          {promoter.conversionRate}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-primary">
                          ${promoter.earnings.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-accent-success">
                          ${promoter.paidEarnings.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-accent-warning">
                          ${promoter.pendingEarnings.toFixed(2)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Promoter Data</h3>
                <p className="text-sm text-secondary">
                  No promoter data found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Payouts Report */}
        <TabsContent value="payouts" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : payouts?.payouts && payouts.payouts.length > 0 ? (
            <>
              {/* Summary Cards */}
              {payouts.summary && (
                <div className="grid grid-cols-4 gap-2">
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total Payouts</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">{payouts.summary.totalPayouts}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total Amount</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-primary">${payouts.summary.totalAmount.toFixed(2)}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Paid</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-accent-success">${payouts.summary.totalPaid.toFixed(2)}</p>
                  </Card>
                  <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                    <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Pending</p>
                    <p className="font-sans text-lg font-bold tracking-tight text-accent-warning">${payouts.summary.totalPending.toFixed(2)}</p>
                  </Card>
                </div>
              )}

              {/* Payouts Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Promoters</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Statement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="font-sans font-semibold text-primary">{payout.event.name}</div>
                          <div className="text-xs text-secondary mt-0.5">{payout.event.slug}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-secondary">
                            {new Date(payout.event.start_time).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{payout.event.currency}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-primary">
                            {formatCurrency(payout.totalAmount, payout.event.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-accent-success">
                            {formatCurrency(payout.paidAmount, payout.event.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-accent-warning">
                            {formatCurrency(payout.pendingAmount, payout.event.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-primary">{payout.promoterCount}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-secondary">
                            {new Date(payout.generated_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payout.statement_pdf_path ? (
                            <a
                              href={payout.statement_pdf_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-accent-primary hover:text-accent-secondary transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View PDF
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-secondary">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Payout Data</h3>
                <p className="text-sm text-secondary">
                  No payout runs found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Attendee Analytics Report */}
        <TabsContent value="attendee_analytics" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : attendeeAnalytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total Attendees</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-primary">{attendeeAnalytics.totalAttendees}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Direct</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-primary">{attendeeAnalytics.bySource.direct}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Via Promoters</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-secondary">{attendeeAnalytics.bySource.promoter}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">User Referrals</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-primary">{attendeeAnalytics.bySource.userReferral}</p>
                </Card>
              </div>

              {/* Trends Chart */}
              {attendeeAnalytics.trends.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-4">Registration & Check-in Trends</h3>
                  <RegistrationChart
                    data={attendeeAnalytics.trends.map(t => ({
                      date: t.month,
                      registrations: t.registrations,
                      checkins: t.checkins,
                    }))}
                    height={200}
                  />
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Attendee Data</h3>
                <p className="text-sm text-secondary">
                  No attendee data found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
