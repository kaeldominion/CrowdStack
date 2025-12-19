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
  Modal,
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
  Building2,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  History,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { DoorStaffModal } from "@/components/DoorStaffModal";
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
  venue_approval_status: string | null;
  venue_approval_at: string | null;
  venue_rejection_reason: string | null;
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

interface EditRecord {
  id: string;
  edited_by: string;
  editor_email: string;
  editor_role: string;
  changes: Record<string, { old: any; new: any }>;
  reason: string | null;
  created_at: string;
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
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDoorStaffModal, setShowDoorStaffModal] = useState(false);
  const [editHistory, setEditHistory] = useState<EditRecord[]>([]);

  useEffect(() => {
    loadEventData();
    loadStats();
    loadAttendees();
    loadEditHistory(); // Load edit history to show badge if there are edits
    
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

  const loadEditHistory = async () => {
    try {
      const response = await fetch(`/api/venue/events/${eventId}/edit`);
      if (response.ok) {
        const data = await response.json();
        setEditHistory(data.edits || []);
      }
    } catch (error) {
      console.error("Failed to load edit history:", error);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    await loadEditHistory();
  };

  const formatApprovalDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update event status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update event status. Please try again.");
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
          <Button variant="secondary">Back to Events</Button>
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
          {editHistory.length > 0 && (
            <Button variant="ghost" onClick={handleOpenHistory}>
              <History className="h-4 w-4 mr-2" />
              <span className="flex items-center gap-1">
                Edit History
                <Badge variant="secondary" size="sm">{editHistory.length}</Badge>
              </span>
            </Button>
          )}
          {event.status === "draft" && (
            event.venue_id && event.venue_approval_status !== "approved" ? (
              <Button
                variant="secondary"
                disabled
                title={
                  event.venue_approval_status === "pending"
                    ? "Waiting for venue approval before publishing"
                    : event.venue_approval_status === "rejected"
                    ? "Venue rejected this event - edit and try a different venue"
                    : "Venue approval required"
                }
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                {event.venue_approval_status === "pending" ? "Awaiting Approval" : "Publish Blocked"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => handleStatusChange("published")}
              >
                Publish Event
              </Button>
            )
          )}
          {event.status === "published" && (
            <Button
              variant="secondary"
              onClick={() => handleStatusChange("draft")}
            >
              Unpublish
            </Button>
          )}
          <Link href={`/door/${eventId}`} target="_blank">
            <Button variant="primary">
              <QrCode className="h-4 w-4 mr-2" />
              Door Scanner
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setShowDoorStaffModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Door Staff
          </Button>
          <Link href={`/app/organizer/live/${eventId}`}>
            <Button variant="secondary">
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

      {/* Venue Approval Status Card */}
      {event.venue_id && event.venue_approval_status && event.venue_approval_status !== "not_required" && (
        <div className={`rounded-xl border-2 p-5 transition-all ${
          event.venue_approval_status === "approved" 
            ? "bg-gradient-to-r from-success/5 to-success/10 border-success/30" 
            : event.venue_approval_status === "rejected"
            ? "bg-gradient-to-r from-error/5 to-error/10 border-error/30"
            : "bg-gradient-to-r from-warning/5 to-warning/10 border-warning/30 animate-pulse"
        }`}>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-3 rounded-full ${
              event.venue_approval_status === "approved"
                ? "bg-success/20"
                : event.venue_approval_status === "rejected"
                ? "bg-error/20"
                : "bg-warning/20"
            }`}>
              {event.venue_approval_status === "approved" ? (
                <ShieldCheck className="h-8 w-8 text-success" />
              ) : event.venue_approval_status === "rejected" ? (
                <ShieldX className="h-8 w-8 text-error" />
              ) : (
                <ShieldAlert className="h-8 w-8 text-warning" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className={`text-lg font-bold ${
                  event.venue_approval_status === "approved"
                    ? "text-success"
                    : event.venue_approval_status === "rejected"
                    ? "text-error"
                    : "text-warning"
                }`}>
                  {event.venue_approval_status === "approved"
                    ? "✓ Approved by Venue"
                    : event.venue_approval_status === "rejected"
                    ? "✗ Rejected by Venue"
                    : "⏳ Awaiting Venue Approval"}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-foreground-muted mb-2">
                <Building2 className="h-4 w-4" />
                <span>{event.venue?.name || "Venue"}</span>
              </div>

              {event.venue_approval_status === "approved" && event.venue_approval_at && (
                <p className="text-sm text-foreground-muted">
                  Approved on {formatApprovalDate(event.venue_approval_at)}
                </p>
              )}

              {event.venue_approval_status === "rejected" && (
                <div className="mt-2 p-3 bg-error/10 rounded-lg border border-error/20">
                  <p className="text-sm text-error font-medium">
                    {event.venue_rejection_reason || "No reason provided"}
                  </p>
                  <p className="text-xs text-foreground-muted mt-1">
                    You can edit the event and try a different venue.
                  </p>
                </div>
              )}

              {event.venue_approval_status === "pending" && (
                <p className="text-sm text-foreground-muted">
                  The venue has been notified and will review your event soon. 
                  You'll receive a notification when they respond.
                </p>
              )}
            </div>

          </div>
        </div>
      )}

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
                <Button variant="secondary">
                  <QrCode className="h-4 w-4 mr-2" />
                  Manage Invite Codes
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Edit History Modal */}
    <Modal
      isOpen={showHistoryModal}
      onClose={() => setShowHistoryModal(false)}
      title="Event Edit History"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">
          This shows all changes made to your event by venue administrators.
        </p>
        {editHistory.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No edits have been made to this event.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {editHistory.map((edit) => (
              <div key={edit.id} className="p-4 border border-border rounded-lg bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${
                      edit.editor_role === "venue_admin" 
                        ? "bg-primary/10" 
                        : "bg-warning/10"
                    }`}>
                      <Building2 className={`h-4 w-4 ${
                        edit.editor_role === "venue_admin" 
                          ? "text-primary" 
                          : "text-warning"
                      }`} />
                    </div>
                    <span className="font-medium text-foreground">{edit.editor_email}</span>
                    <Badge variant="secondary" size="sm">
                      {edit.editor_role === "venue_admin" ? "Venue Admin" : edit.editor_role}
                    </Badge>
                  </div>
                  <span className="text-sm text-foreground-muted">
                    {formatApprovalDate(edit.created_at)}
                  </span>
                </div>

                {edit.reason && (
                  <p className="text-sm text-foreground-muted mb-3 italic bg-background/50 p-2 rounded">
                    "{edit.reason}"
                  </p>
                )}

                <div className="space-y-2">
                  {Object.entries(edit.changes).map(([field, { old, new: newVal }]) => (
                    <div key={field} className="text-sm flex items-start gap-2">
                      <span className="font-medium text-foreground capitalize min-w-24">
                        {field.replace(/_/g, " ")}:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-error/10 text-error rounded line-through">
                          {String(old) || "(empty)"}
                        </span>
                        <span className="text-foreground-muted">→</span>
                        <span className="px-2 py-0.5 bg-success/10 text-success rounded">
                          {String(newVal) || "(empty)"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={() => setShowHistoryModal(false)}>
            Close
          </Button>
        </div>
      </div>
    </Modal>

    {/* Door Staff Modal */}
    {event && (
      <DoorStaffModal
        isOpen={showDoorStaffModal}
        onClose={() => setShowDoorStaffModal(false)}
        eventId={event.id}
        eventName={event.name}
      />
    )}
    </div>
  );
}
