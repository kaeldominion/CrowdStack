"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Badge, Modal, Input, Textarea, Select } from "@crowdstack/ui";
import { 
  Calendar, 
  Clock, 
  User, 
  Edit, 
  History, 
  ArrowLeft,
  Users,
  Check,
  X,
  QrCode,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { DoorStaffModal } from "@/components/DoorStaffModal";

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  capacity: number | null;
  status: string;
  venue_approval_status: string;
  organizer: { id: string; name: string; email: string | null };
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

export default function VenueEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDoorStaffModal, setShowDoorStaffModal] = useState(false);
  const [editHistory, setEditHistory] = useState<EditRecord[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    capacity: "",
    status: "",
    reason: "",
  });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const response = await fetch(`/api/venue/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
        setEditForm({
          name: data.event.name || "",
          description: data.event.description || "",
          start_time: data.event.start_time?.slice(0, 16) || "",
          end_time: data.event.end_time?.slice(0, 16) || "",
          capacity: data.event.capacity?.toString() || "",
          status: data.event.status || "",
          reason: "",
        });
      }
    } catch (error) {
      console.error("Failed to load event:", error);
    } finally {
      setLoading(false);
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

  const handleSaveEdit = async () => {
    if (!event) return;

    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      
      if (editForm.name !== event.name) updates.name = editForm.name;
      if (editForm.description !== (event.description || "")) updates.description = editForm.description || null;
      if (editForm.start_time !== event.start_time?.slice(0, 16)) updates.start_time = editForm.start_time;
      if (editForm.end_time !== (event.end_time?.slice(0, 16) || "")) updates.end_time = editForm.end_time || null;
      if (editForm.capacity !== (event.capacity?.toString() || "")) updates.capacity = editForm.capacity ? parseInt(editForm.capacity) : null;
      if (editForm.status !== event.status) updates.status = editForm.status;

      if (Object.keys(updates).length === 0) {
        alert("No changes to save");
        return;
      }

      const response = await fetch(`/api/venue/events/${eventId}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, reason: editForm.reason || undefined }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save changes");
      }

      await loadEvent();
      setShowEditModal(false);
      setEditForm((prev) => ({ ...prev, reason: "" }));
    } catch (error: any) {
      alert(error.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "published":
        return <Badge variant="success">Published</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="warning">Pending Approval</Badge>;
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="danger">Rejected</Badge>;
      case "not_required":
        return <Badge variant="secondary">No Approval Needed</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-foreground mb-2">Event Not Found</h2>
        <p className="text-foreground-muted mb-4">This event doesn't exist or you don't have access.</p>
        <Link href="/app/venue/events">
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/venue/events">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground">
            {event.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {getStatusBadge(event.status)}
            {getApprovalBadge(event.venue_approval_status)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button variant="secondary" onClick={handleOpenHistory}>
            <History className="h-4 w-4 mr-2" />
            Edit History
          </Button>
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Event
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Date & Time</p>
                <p className="text-sm text-foreground-muted">{formatDate(event.start_time)}</p>
                {event.end_time && (
                  <p className="text-sm text-foreground-muted">Until {formatDate(event.end_time)}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Organizer</p>
                <p className="text-sm text-foreground-muted">{event.organizer.name}</p>
                {event.organizer.email && (
                  <p className="text-sm text-foreground-muted">{event.organizer.email}</p>
                )}
              </div>
            </div>

            {event.capacity && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Capacity</p>
                  <p className="text-sm text-foreground-muted">{event.capacity} attendees</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
          <p className="text-foreground-muted whitespace-pre-wrap">
            {event.description || "No description provided."}
          </p>
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Event"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Event Name"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <Textarea
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={4}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Start Time"
              type="datetime-local"
              value={editForm.start_time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
            />
            <Input
              label="End Time"
              type="datetime-local"
              value={editForm.end_time}
              onChange={(e) => setEditForm((prev) => ({ ...prev, end_time: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Capacity"
              type="number"
              value={editForm.capacity}
              onChange={(e) => setEditForm((prev) => ({ ...prev, capacity: e.target.value }))}
              placeholder="Leave empty for unlimited"
            />
            <Select
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "cancelled", label: "Cancelled" },
                { value: "completed", label: "Completed" },
              ]}
            />
          </div>

          <Textarea
            label="Reason for Changes (optional)"
            placeholder="Explain why you're making these changes..."
            value={editForm.reason}
            onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Edit History"
        size="lg"
      >
        <div className="space-y-4">
          {editHistory.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No edits have been made to this event yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editHistory.map((edit) => (
                <div key={edit.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-foreground-muted" />
                      <span className="font-medium text-foreground">{edit.editor_email}</span>
                      <Badge variant="secondary" size="sm">{edit.editor_role}</Badge>
                    </div>
                    <span className="text-sm text-foreground-muted">
                      {formatShortDate(edit.created_at)}
                    </span>
                  </div>

                  {edit.reason && (
                    <p className="text-sm text-foreground-muted mb-2 italic">
                      Reason: {edit.reason}
                    </p>
                  )}

                  <div className="space-y-1">
                    {Object.entries(edit.changes).map(([field, { old, new: newVal }]) => (
                      <div key={field} className="text-sm">
                        <span className="font-medium text-foreground">{field}:</span>{" "}
                        <span className="text-error line-through">{old || "(empty)"}</span>
                        {" → "}
                        <span className="text-success">{newVal || "(empty)"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
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
