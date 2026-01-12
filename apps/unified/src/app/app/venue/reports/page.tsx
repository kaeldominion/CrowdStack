"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Tabs, TabsList, TabsTrigger, TabsContent } from "@crowdstack/ui";
import { Download, Calendar, TrendingUp, Users, DollarSign, Building2, FileText, BarChart3 } from "lucide-react";
import { RegistrationChart } from "@/components/charts/RegistrationChart";
import { EarningsChart } from "@/components/charts/EarningsChart";

type ReportType = "event_performance" | "attendee_analytics" | "revenue" | "organizer_performance";

interface EventPerformanceData {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  capacity: number | null;
  organizer: { id: string; name: string } | null;
  registrations: number;
  checkins: number;
  conversionRate: number;
}

interface AttendeeAnalyticsData {
  totalAttendees: number;
  newAttendees: number;
  returningAttendees: number;
  vipCount: number;
  flaggedCount: number;
  trends: Array<{ month: string; newAttendees: number; totalAttendees: number }>;
}

interface OrganizerPerformanceData {
  id: string;
  name: string;
  email: string | null;
  events: number;
  registrations: number;
  checkins: number;
  conversionRate: number;
}

interface RevenueData {
  totalRevenue: number;
  totalCommissions: number;
  events: Array<{
    id: string;
    name: string;
    slug: string;
    start_time: string;
    currency: string;
    revenue: number;
    commissions: number;
  }>;
  byCurrency: Record<string, { revenue: number; commissions: number }>;
}

export default function VenueReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("event_performance");
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Data states
  const [eventPerformance, setEventPerformance] = useState<{
    events: EventPerformanceData[];
    summary: { totalEvents: number; totalRegistrations: number; totalCheckins: number; avgConversionRate: number } | null;
  } | null>(null);
  const [attendeeAnalytics, setAttendeeAnalytics] = useState<AttendeeAnalyticsData | null>(null);
  const [organizerPerformance, setOrganizerPerformance] = useState<{ organizers: OrganizerPerformanceData[] } | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

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

      const response = await fetch(`/api/venue/reports?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        
        switch (activeReport) {
          case "event_performance":
            setEventPerformance(data);
            break;
          case "attendee_analytics":
            setAttendeeAnalytics(data);
            break;
          case "organizer_performance":
            setOrganizerPerformance(data);
            break;
          case "revenue":
            setRevenue(data);
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
        const headers = ["Event Name", "Date", "Organizer", "Registrations", "Check-ins", "Conversion Rate", "Status"];
        const rows = eventPerformance.events.map(e => [
          e.name,
          new Date(e.start_time).toLocaleDateString(),
          e.organizer?.name || "N/A",
          e.registrations.toString(),
          e.checkins.toString(),
          `${e.conversionRate}%`,
          e.status,
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `venue-event-performance-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "attendee_analytics": {
        if (!attendeeAnalytics) return;
        const headers = ["Month", "New Attendees", "Total Attendees"];
        const rows = attendeeAnalytics.trends.map(t => [
          t.month,
          t.newAttendees.toString(),
          t.totalAttendees.toString(),
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `venue-attendee-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "organizer_performance": {
        if (!organizerPerformance?.organizers) return;
        const headers = ["Organizer", "Events", "Registrations", "Check-ins", "Conversion Rate"];
        const rows = organizerPerformance.organizers.map(o => [
          o.name,
          o.events.toString(),
          o.registrations.toString(),
          o.checkins.toString(),
          `${o.conversionRate}%`,
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `venue-organizer-performance-${new Date().toISOString().split("T")[0]}.csv`;
        break;
      }
      case "revenue": {
        if (!revenue?.events) return;
        const headers = ["Event", "Date", "Currency", "Revenue", "Commissions"];
        const rows = revenue.events.map(e => [
          e.name,
          new Date(e.start_time).toLocaleDateString(),
          e.currency,
          e.revenue.toFixed(2),
          e.commissions.toFixed(2),
        ]);
        csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
        filename = `venue-revenue-${new Date().toISOString().split("T")[0]}.csv`;
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
            Analytics and insights for your venue
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
          <TabsTrigger value="attendee_analytics">
            <Users className="h-4 w-4 mr-2" />
            Attendee Analytics
          </TabsTrigger>
          <TabsTrigger value="organizer_performance">
            <Building2 className="h-4 w-4 mr-2" />
            Organizer Performance
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue & Commissions
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
                <div className="grid grid-cols-4 gap-2">
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
                </div>
              )}

              {/* Events Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Organizer</TableHead>
                      <TableHead>Registrations</TableHead>
                      <TableHead>Check-ins</TableHead>
                      <TableHead>Conversion</TableHead>
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
                          <div className="text-sm text-primary">{event.organizer?.name || "—"}</div>
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
              <div className="grid grid-cols-5 gap-2">
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-primary">{attendeeAnalytics.totalAttendees}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">New</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-primary">{attendeeAnalytics.newAttendees}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Returning</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-secondary">{attendeeAnalytics.returningAttendees}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">VIPs</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-amber-400">{attendeeAnalytics.vipCount}</p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Flagged</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-error">{attendeeAnalytics.flaggedCount}</p>
                </Card>
              </div>

              {/* Trends Chart */}
              {attendeeAnalytics.trends.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-primary mb-4">Attendee Trends</h3>
                  <RegistrationChart
                    data={attendeeAnalytics.trends.map(t => ({
                      date: t.month,
                      registrations: t.totalAttendees,
                      checkins: t.newAttendees,
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

        {/* Organizer Performance Report */}
        <TabsContent value="organizer_performance" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : organizerPerformance?.organizers && organizerPerformance.organizers.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Registrations</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizerPerformance.organizers.map((organizer) => (
                    <TableRow key={organizer.id}>
                      <TableCell>
                        <div className="font-sans font-semibold text-primary">{organizer.name}</div>
                        {organizer.email && (
                          <div className="text-xs text-secondary mt-0.5">{organizer.email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{organizer.events}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{organizer.registrations}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-primary">{organizer.checkins}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${
                          organizer.conversionRate >= 70 ? "text-accent-success" :
                          organizer.conversionRate >= 40 ? "text-accent-warning" :
                          "text-secondary"
                        }`}>
                          {organizer.conversionRate}%
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
                <Building2 className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Organizer Data</h3>
                <p className="text-sm text-secondary">
                  No organizer data found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Report */}
        <TabsContent value="revenue" className="space-y-4">
          {loading ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-secondary">Loading report...</p>
              </div>
            </Card>
          ) : revenue ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total Revenue</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-primary">
                    {Object.entries(revenue.byCurrency).map(([currency, data]) => (
                      <span key={currency}>
                        {formatCurrency(data.revenue, currency)} {currency}
                      </span>
                    ))}
                  </p>
                </Card>
                <Card className="[&>div]:!px-3 [&>div]:!py-2.5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-secondary mb-0.5">Total Commissions</p>
                  <p className="font-sans text-lg font-bold tracking-tight text-accent-success">
                    {Object.entries(revenue.byCurrency).map(([currency, data]) => (
                      <span key={currency}>
                        {formatCurrency(data.commissions, currency)} {currency}
                      </span>
                    ))}
                  </p>
                </Card>
              </div>

              {/* Revenue by Event */}
              {revenue.events.length > 0 && (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Commissions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenue.events.map((event) => (
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
                            <div className="text-sm text-primary">{event.currency}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-primary">
                              {formatCurrency(event.revenue, event.currency)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-accent-success">
                              {formatCurrency(event.commissions, event.currency)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-secondary mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Revenue Data</h3>
                <p className="text-sm text-secondary">
                  No revenue data found for the selected date range.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
