"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Input,
  Modal,
  Badge,
  LoadingSpinner,
  InlineSpinner,
  ConfirmModal,
} from "@crowdstack/ui";
import { Plus, Trash2, DoorOpen, User, Mail, Shield, Search, Check, UserPlus } from "lucide-react";

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

interface SearchUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  already_assigned: boolean;
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
  const [newStaffNotes, setNewStaffNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  // Revoke confirmation state
  const [confirmRevoke, setConfirmRevoke] = useState<{ staffId: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

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

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, entityId, type]);

  const searchUsers = async (query: string) => {
    setSearching(true);
    try {
      const searchUrl = type === "venue"
        ? `/api/venue/door-staff/search-users?q=${encodeURIComponent(query)}${entityId ? `&venueId=${entityId}` : ""}`
        : `/api/organizer/door-staff/search-users?q=${encodeURIComponent(query)}${entityId ? `&organizerId=${entityId}` : ""}`;
      
      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleAssignUser = async (user: SearchUser) => {
    setAssigningUserId(user.id);
    try {
      const body: Record<string, string> = {
        email: user.email,
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

      // Reset and reload
      setShowAddModal(false);
      setSearchQuery("");
      setSearchResults([]);
      setNewStaffNotes("");
      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add door staff");
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleRevokeAccess = async () => {
    if (!confirmRevoke) return;

    setRevoking(true);
    try {
      const deleteUrl = type === "venue"
        ? `/api/venue/door-staff?staff_id=${confirmRevoke.staffId}${entityId ? `&venueId=${entityId}` : ""}`
        : `/api/organizer/door-staff?staff_id=${confirmRevoke.staffId}${entityId ? `&organizerId=${entityId}` : ""}`;

      const response = await fetch(deleteUrl, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }

      setConfirmRevoke(null);
      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access");
    } finally {
      setRevoking(false);
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
          <div className="p-2 bg-accent-secondary/10 rounded-lg">
            <DoorOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Permanent Door Staff</h3>
            <p className="text-sm text-secondary">
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
        <div className="text-center py-8 text-secondary border border-dashed border-border rounded-lg">
          <DoorOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No permanent door staff assigned yet</p>
          <p className="text-sm mt-1">Add staff members who need access to all {type} events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeStaff.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center justify-between p-4 bg-raised rounded-lg"
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
                  <p className="font-medium text-primary">{staff.user_name}</p>
                  <p className="text-sm text-secondary flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {staff.user_email}
                  </p>
                  {staff.notes && (
                    <p className="text-xs text-secondary mt-1">{staff.notes}</p>
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
                  onClick={() => setConfirmRevoke({ staffId: staff.id, name: staff.user_name })}
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
          setSearchQuery("");
          setSearchResults([]);
          setNewStaffNotes("");
        }}
        title="Add Permanent Door Staff"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Search for a user by email to add as permanent door staff for all {resolvedEntityName || type} events.
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email..."
              className="pl-10"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <InlineSpinner size="sm" />
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.already_assigned
                        ? "bg-raised border-border opacity-60"
                        : "bg-raised border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {user.name?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-primary">{user.name}</p>
                        <p className="text-sm text-secondary">{user.email}</p>
                      </div>
                    </div>
                    {user.already_assigned ? (
                      <Badge variant="secondary" size="sm" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Added
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAssignUser(user)}
                        loading={assigningUserId === user.id}
                        disabled={assigningUserId !== null}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                ))
              ) : !searching ? (
                <div className="text-center py-6 text-secondary">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users found</p>
                  <p className="text-sm">Try a different email address</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Notes field (shown when search has results) */}
          {searchResults.length > 0 && (
            <Input
              label="Notes (optional)"
              value={newStaffNotes}
              onChange={(e) => setNewStaffNotes(e.target.value)}
              placeholder="e.g., Head of Security"
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setSearchQuery("");
                setSearchResults([]);
                setNewStaffNotes("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={handleRevokeAccess}
        title="Remove Permanent Door Staff"
        message={
          <>
            Are you sure you want to remove <strong>{confirmRevoke?.name}</strong> from permanent door staff? 
            They will no longer have automatic access to all {type} events.
          </>
        }
        confirmText="Remove Access"
        cancelText="Cancel"
        variant="danger"
        loading={revoking}
      />
    </Card>
  );
}

