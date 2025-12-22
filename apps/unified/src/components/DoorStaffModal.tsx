"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Input, Badge, LoadingSpinner, InlineSpinner } from "@crowdstack/ui";
import { UserPlus, Link as LinkIcon, Copy, Check, Trash2, Users, Clock, Mail, Shield, Search, X } from "lucide-react";

interface DoorStaff {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  notes: string | null;
  assigned_at: string;
  is_permanent?: boolean;
  permanent_source?: "venue" | "organizer";
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  expires_at: string;
  created_at: string;
  invite_url?: string;
}

interface SearchUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  already_assigned: boolean;
}

interface DoorStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  venueId?: string;
  organizerId?: string;
}

export function DoorStaffModal({ isOpen, onClose, eventId, eventName, venueId, organizerId }: DoorStaffModalProps) {
  const [doorStaff, setDoorStaff] = useState<DoorStaff[]>([]);
  const [permanentStaff, setPermanentStaff] = useState<DoorStaff[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add staff state
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [makePermanent, setMakePermanent] = useState(false);

  // Invite link state (fallback for users not in system)
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDoorStaff();
    }
  }, [isOpen, eventId]);

  const loadDoorStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/door-staff`);
      if (!response.ok) throw new Error("Failed to load door staff");
      const data = await response.json();
      setDoorStaff(data.door_staff || []);
      setPendingInvites(data.pending_invites || []);

      // Also load permanent staff from venue/organizer
      const permanentList: DoorStaff[] = [];

      if (venueId) {
        try {
          const venueResponse = await fetch(`/api/venue/door-staff?venueId=${venueId}`);
          if (venueResponse.ok) {
            const venueData = await venueResponse.json();
            (venueData.door_staff || []).forEach((staff: DoorStaff) => {
              if (staff.status === "active") {
                permanentList.push({
                  ...staff,
                  is_permanent: true,
                  permanent_source: "venue",
                });
              }
            });
          }
        } catch (e) {
          // Ignore venue fetch errors
        }
      }

      if (organizerId) {
        try {
          const organizerResponse = await fetch(`/api/organizer/door-staff?organizerId=${organizerId}`);
          if (organizerResponse.ok) {
            const organizerData = await organizerResponse.json();
            (organizerData.door_staff || []).forEach((staff: DoorStaff) => {
              if (staff.status === "active" && !permanentList.some(p => p.user_id === staff.user_id)) {
                permanentList.push({
                  ...staff,
                  is_permanent: true,
                  permanent_source: "organizer",
                });
              }
            });
          }
        } catch (e) {
          // Ignore organizer fetch errors
        }
      }

      setPermanentStaff(permanentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, eventId]);

  const searchUsers = async (query: string) => {
    setSearching(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/door-staff/search-users?q=${encodeURIComponent(query)}`
      );
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
      const response = await fetch(`/api/events/${eventId}/door-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          user_id: user.id,
          make_permanent: makePermanent,
          venue_id: venueId,
          organizer_id: organizerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign user");
      }

      // Reset and reload
      setSearchQuery("");
      setSearchResults([]);
      setMakePermanent(false);
      setShowAddStaff(false);
      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign user");
    } finally {
      setAssigningUserId(null);
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const response = await fetch(`/api/events/${eventId}/door-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          email: searchQuery || undefined,
          make_permanent: makePermanent,
          venue_id: venueId,
          organizer_id: organizerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invite");
      }

      const data = await response.json();
      setNewInviteUrl(data.invite.invite_url);
      setSearchQuery("");
      setMakePermanent(false);
      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCopyLink = async () => {
    if (newInviteUrl) {
      await navigator.clipboard.writeText(newInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeAccess = async (staffId: string) => {
    if (!confirm("Are you sure you want to revoke this person's door staff access?")) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/door-staff?staff_id=${staffId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke access");
      }

      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/door-staff?invite_id=${inviteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete invite");
      }

      loadDoorStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete invite");
    }
  };

  const activeStaff = doorStaff.filter((s) => s.status === "active");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Door Staff"
      size="lg"
    >
      <div className="space-y-6">
        {/* Event info */}
        <div className="p-3 bg-surface-secondary rounded-lg">
          <p className="text-sm text-foreground-muted">Managing door staff for:</p>
          <p className="font-medium text-foreground">{eventName}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner text="Loading staff..." size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-danger">{error}</div>
        ) : (
          <>
            {/* Permanent door staff (from venue/organizer) */}
            {permanentStaff.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permanent Door Staff ({permanentStaff.length})
                </h3>
                <div className="space-y-2">
                  {permanentStaff.map((staff) => (
                    <div
                      key={`permanent-${staff.id}`}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-primary/20"
                    >
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          {staff.user_name}
                          <Badge variant="primary" size="sm">
                            {staff.permanent_source === "venue" ? "Venue Staff" : "Organizer Staff"}
                          </Badge>
                        </p>
                        <p className="text-sm text-foreground-muted">{staff.user_email}</p>
                        {staff.notes && (
                          <p className="text-xs text-foreground-muted mt-1">{staff.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-foreground-muted">
                        Managed in settings
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event-specific door staff */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Event Door Staff ({activeStaff.length})
              </h3>
              
              {activeStaff.length === 0 ? (
                <div className="text-center py-6 text-foreground-muted border border-dashed border-border rounded-lg">
                  No event-specific door staff assigned yet
                  {permanentStaff.length > 0 && (
                    <p className="text-xs mt-1">Permanent staff above will have access</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeStaff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{staff.user_name}</p>
                        <p className="text-sm text-foreground-muted">{staff.user_email}</p>
                        {staff.notes && (
                          <p className="text-xs text-foreground-muted mt-1">{staff.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(staff.id)}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending invites */}
            {pendingInvites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invites ({pendingInvites.length})
                </h3>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                    >
                      <div>
                        {invite.email ? (
                          <p className="font-medium text-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {invite.email}
                          </p>
                        ) : (
                          <p className="font-medium text-foreground">Open invite link</p>
                        )}
                        <p className="text-xs text-foreground-muted">
                          Expires: {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="text-danger hover:text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add staff section */}
            <div className="border-t border-border pt-4">
              {newInviteUrl ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Invite Link Created!
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={newInviteUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button onClick={handleCopyLink} variant="secondary">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Share this link with your door staff. They'll need to log in to accept.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setNewInviteUrl(null)}
                  >
                    Add Another
                  </Button>
                </div>
              ) : showAddStaff ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Add Door Staff</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddStaff(false);
                        setSearchQuery("");
                        setSearchResults([]);
                        setMakePermanent(false);
                        setShowInviteLink(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Input
                      placeholder="Search by email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {searching ? (
                        <InlineSpinner size="sm" />
                      ) : (
                        <Search className="h-4 w-4 text-foreground-muted" />
                      )}
                    </div>
                  </div>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                {user.name?.[0]?.toUpperCase() || "?"}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{user.name}</p>
                              <p className="text-xs text-foreground-muted">{user.email}</p>
                            </div>
                          </div>
                          {user.already_assigned ? (
                            <Badge variant="secondary" size="sm">Already Added</Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAssignUser(user)}
                              disabled={assigningUserId === user.id}
                              loading={assigningUserId === user.id}
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No results / Create invite option */}
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <div className="text-center py-4 text-foreground-muted border border-dashed border-border rounded-lg">
                      <p className="text-sm">No users found with that email</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowInviteLink(true)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Create Invite Link Instead
                      </Button>
                    </div>
                  )}

                  {/* Create invite link section */}
                  {showInviteLink && (
                    <div className="p-3 bg-surface-secondary rounded-lg space-y-3">
                      <p className="text-sm text-foreground-muted">
                        User not in system? Create an invite link they can use to get access.
                      </p>
                      <Button
                        onClick={handleCreateInvite}
                        disabled={creatingInvite}
                        loading={creatingInvite}
                        className="w-full"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Generate Invite Link {searchQuery && `for ${searchQuery}`}
                      </Button>
                    </div>
                  )}

                  {/* Make permanent checkbox */}
                  {(venueId || organizerId) && (
                    <div className="p-3 bg-surface-secondary rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={makePermanent}
                          onChange={(e) => setMakePermanent(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Grant permanent access
                          </p>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            Access to all {venueId ? "venue" : "organizer"} events, not just this one
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <Button onClick={() => setShowAddStaff(true)} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Door Staff
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

