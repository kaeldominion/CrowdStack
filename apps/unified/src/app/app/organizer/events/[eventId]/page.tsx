"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@crowdstack/ui";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  TrendingUp,
  Settings,
  QrCode,
  Radio,
  Edit,
  Eye,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface EventData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  cover_image_url: string | null;
  promoter_access_type: string;
  organizer_id: string;
  venue_id: string | null;
  created_at: string;
  organizer?: { id: string; name: string; email: string | null };
  venue?: { id: string; name: string; address: string | null; city: string | null };
  event_promoters?: Array<{
    id: string;
    promoter: { id: string; name: string; email: string | null } | null;
    commission_type: string;
    commission_config: any;
  }>;
}

interface Stats {
  total_registrations: number;
  total_check_ins: number;
  capacity: number | null;
  capacity_remaining: number | null;
  capacity_percentage: number | null;
  recent_registrations_24h: number;
  promoter_breakdown: Array<{
    promoter_id: string;
    promoter_name: string;
    registrations: number;
    check_ins: number;
  }>;
}

interface Attendee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  registration_date: string;
  checked_in: boolean;
  check_in_time: string | null;
  promoter_name: string | null;
}

export default function OrganizerEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEventData();
    loadStats();
    loadAttendees();
    
    // Refresh stats every 30 seconds
    const statsInterval = setInterval(loadStats, 30000);
    return () => clearInterval(statsInterval);
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      } else if (response.status === 403 || response.status === 404) {
        router.push("/app/organizer/events");
      }
    } catch (error) {
      console.error("Failed to load event:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadAttendees = async () => {
    try {
      const response = await fetch(`/api/organizer/attendees?event_id=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setAttendees(data || []);
      }
    } catch (error) {
      console.error("Failed to load attendees:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        loadEventData();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "error"> = {
      draft: "default",
      published: "success",
      cancelled: "error",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredAttendees = attendees.filter((a) =>
    searchQuery
      ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone?.includes(searchQuery)
      : true
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-foreground-muted">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-foreground-muted" />
        <div className="text-foreground-muted">Event not found</div>
        <Link href="/app/organizer/events">
          <Button variant="default">Back to Events</Button>
        </Link>
      </div>
    );
  }

  const eventUrl = `/e/${event.slug}`;

  // Prepare chart data
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    registrations: Math.floor(Math.random() * 10), // Placeholder - replace with real data
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/organizer/events">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{event.name}</h1>
              {getStatusBadge(event.status)}
            </div>
            {event.venue && (
              <div className="flex items-center gap-2 text-foreground-muted mt-1">
                <MapPin className="h-4 w-4" />
                <span>{event.venue.name}</span>
                {event.venue.city && <span>• {event.venue.city}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {event.status === "draft" && (
            <Button
              variant="success"
              onClick={() => handleStatusChange("published")}
            >
              Publish Event
            </Button>
          )}
          {event.status === "published" && (
            <Button
              variant="default"
              onClick={() => handleStatusChange("draft")}
            >
              Unpublish
            </Button>
          )}
          <Link href={`/app/organizer/events/${eventId}/live`}>
            <Button variant="primary">
              <Radio className="h-4 w-4 mr-2" />
              Live Control
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(eventUrl)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="space-y-2">
              <div className="text-sm text-foreground-muted">Registrations</div>
              <div className="text-3xl font-bold text-foreground">
                {stats.total_registrations}
              </div>
              <div className="text-xs text-foreground-muted flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.recent_registrations_24h} in last 24h
              </div>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <div className="text-sm text-foreground-muted">Check-ins</div>
              <div className="text-3xl font-bold text-foreground">
                {stats.total_check_ins}
              </div>
              <div className="text-xs text-foreground-muted flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {stats.total_registrations > 0
                  ? Math.round((stats.total_check_ins / stats.total_registrations) * 100)
                  : 0}
                % conversion
              </div>
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <div className="text-sm text-foreground-muted">Capacity</div>
              <div className="text-3xl font-bold text-foreground">
                {stats.capacity ? `${stats.capacity_remaining}/${stats.capacity}` : "Unlimited"}
              </div>
              {stats.capacity && (
                <div className="text-xs text-foreground-muted">
                  {stats.capacity_percentage}% full
                </div>
              )}
            </div>
          </Card>
          <Card>
            <div className="space-y-2">
              <div className="text-sm text-foreground-muted">Promoters</div>
              <div className="text-3xl font-bold text-foreground">
                {event.event_promoters?.length || 0}
              </div>
              <div className="text-xs text-foreground-muted">
                Active promotions
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendees">Attendees ({attendees.length})</TabsTrigger>
          <TabsTrigger value="promoters">Promoters</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Event Info */}
          <Card>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Event Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-foreground-muted">Start Time</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground">
                      {new Date(event.start_time).toLocaleString()}
                    </span>
                  </div>
                </div>
                {event.end_time && (
                  <div>
                    <div className="text-sm text-foreground-muted">End Time</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-foreground-muted" />
                      <span className="text-foreground">
                        {new Date(event.end_time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {event.description && (
                <div>
                  <div className="text-sm text-foreground-muted mb-2">Description</div>
                  <p className="text-foreground">{event.description}</p>
                </div>
              )}
              <div>
                <div className="text-sm text-foreground-muted mb-2">Public URL</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background-secondary px-2 py-1 rounded">
                    {eventUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(eventUrl);
                      window.open(eventUrl, "_blank");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Registrations Over Time
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="registrations" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Promoter Performance
              </h3>
              {stats && stats.promoter_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.promoter_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="promoter_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="check_ins" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
              <div className="text-center text-foreground-muted py-8">
                No promoter data yet
              </div>
            )}
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="attendees" className="space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Attendees</h2>
            <Input
              placeholder="Search attendees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Promoter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-foreground-muted py-8">
                    No attendees found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">{attendee.name}</TableCell>
                    <TableCell>{attendee.email || "-"}</TableCell>
                    <TableCell>{attendee.phone || "-"}</TableCell>
                    <TableCell>
                      {new Date(attendee.registration_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {attendee.checked_in ? (
                        <Badge variant="success" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" />
                          Registered
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{attendee.promoter_name || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="promoters" className="space-y-4">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Promoters</h2>
            <Link href={`/app/organizer/events/${eventId}/invites`}>
              <Button variant="primary">
                <QrCode className="h-4 w-4 mr-2" />
                Manage Invites
              </Button>
            </Link>
          </div>
          {event.event_promoters && event.event_promoters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promoter</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Commission Type</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Check-ins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.event_promoters.map((ep) => {
                  const promoterStats = stats?.promoter_breakdown.find(
                    (p) => p.promoter_id === ep.promoter?.id
                  );
                  return (
                    <TableRow key={ep.id}>
                      <TableCell className="font-medium">
                        {ep.promoter?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{ep.promoter?.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="default">{ep.commission_type}</Badge>
                      </TableCell>
                      <TableCell>{promoterStats?.registrations || 0}</TableCell>
                      <TableCell>{promoterStats?.check_ins || 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-foreground-muted py-8">
              No promoters assigned to this event
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4">
        <Card>
          <h2 className="text-xl font-semibold text-foreground mb-4">Event Settings</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-foreground-muted mb-2">Promoter Access</div>
              <Badge variant="default">{event.promoter_access_type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/app/organizer/events/${eventId}/invites`}>
                <Button variant="default">
                  <QrCode className="h-4 w-4 mr-2" />
                  Manage Invite Codes
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
}
