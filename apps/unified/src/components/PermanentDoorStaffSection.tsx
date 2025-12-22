"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Input,
  Modal,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import { Plus, Trash2, DoorOpen, User, Mail, Shield } from "lucide-react";

interface DoorStaff {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  avatar_url?: string;
  status: string;
  notes: string | null;
  assigned_at: string;
}

interface PermanentDoorStaffSectionProps {
  type: "venue" | "organizer";
  entityId?: string; // Optional - will use current user's entity if not provided
  entityName?: string;
}

export function PermanentDoorStaffSection({ type, entityId, entityName }: PermanentDoorStaffSectionProps) {
  const [doorStaff, setDoorStaff] = useState<DoorStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedEntityName, setResolvedEntityName] = useState(entityName || "");
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffNotes, setNewStaffNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const apiEndpoint = type === "venue" 
    ? `/api/venue/door-staff${entityId ? `?venueId=${entityId}` : ""}`
    : `/api/organizer/door-staff${entityId ? `?organizerId=${entityId}` : ""}`;

  useEffect(() => {
    loadDoorStaff();
  }, [entityId, type]);

  const loadDoorStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiEndpoint);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load door staff");
      }
      
      const data = await response.json();
      setDoorStaff(data.door_staff || []);
      setResolvedEntityName(data.venue_name || data.organizer_name || entityName || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    setAdding(true);
    try {
      const body: Record<string, string> = {
        email: newStaffEmail.trim(),
      };
      if (newStaffNotes.trim()) {
        body.notes = newStaffNotes.trim();
      }
      if (entityId) {
        body[type === "venue" ? "venueId" : "organizerId"] = entityId;
      }

      const response = await fetch(
        type === "venue" ? "/api/venue/door-staff" : "/api/organizer/door-staff",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add door staff");
      }

      setShowAddModal(false);
      setNewStaffEmail("");
      setNewStaffNotes("");
      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add door staff");
    } finally {
      setAdding(false);
    }
  };

  const handleRevokeAccess = async (staffId: string) => {
    if (!confirm("Are you sure you want to revoke this person's permanent door staff access?")) {
      return;
    }

    try {
      const deleteUrl = type === "venue"
        ? `/api/venue/door-staff?staff_id=${staffId}${entityId ? `&venueId=${entityId}` : ""}`
        : `/api/organizer/door-staff?staff_id=${staffId}${entityId ? `&organizerId=${entityId}` : ""}`;

      const response = await fetch(deleteUrl, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }

      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const activeStaff = doorStaff.filter((s) => s.status === "active");

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner text="Loading door staff..." size="md" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-danger">{error}</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Permanent Door Staff</h3>
            <p className="text-sm text-foreground-muted">
              {resolvedEntityName ? `Staff with access to all ${resolvedEntityName} events` : `Staff with access to all ${type} events`}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Staff List */}
      {activeStaff.length === 0 ? (
        <div className="text-center py-8 text-foreground-muted border border-dashed border-border rounded-lg">
          <DoorOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No permanent door staff assigned yet</p>
          <p className="text-sm mt-1">Add staff members who need access to all {type} events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeStaff.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden">
                  {staff.avatar_url ? (
                    <img src={staff.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold">
                      {staff.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{staff.user_name}</p>
                  <p className="text-sm text-foreground-muted flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {staff.user_email}
                  </p>
                  {staff.notes && (
                    <p className="text-xs text-foreground-muted mt-1">{staff.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Permanent
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeAccess(staff.id)}
                  className="text-danger hover:text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewStaffEmail("");
          setNewStaffNotes("");
        }}
        title="Add Permanent Door Staff"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Add a user as permanent door staff. They will have access to the door scanner for all {resolvedEntityName || type} events.
          </p>

          <Input
            label="User Email"
            type="email"
            value={newStaffEmail}
            onChange={(e) => setNewStaffEmail(e.target.value)}
            placeholder="staff@example.com"
            required
            helperText="The user must already have an account"
          />

          <Input
            label="Notes (optional)"
            value={newStaffNotes}
            onChange={(e) => setNewStaffNotes(e.target.value)}
            placeholder="e.g., Head of Security"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setNewStaffEmail("");
                setNewStaffNotes("");
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddStaff}
              disabled={adding || !newStaffEmail.trim()}
              loading={adding}
            >
              Add Door Staff
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

