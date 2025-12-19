"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Badge } from "@crowdstack/ui";
import { UserPlus, Link as LinkIcon, Copy, Check, Trash2, Users, Clock, Mail } from "lucide-react";

interface DoorStaff {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  status: string;
  notes: string | null;
  assigned_at: string;
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  expires_at: string;
  created_at: string;
  invite_url?: string;
}

interface DoorStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

export function DoorStaffModal({ isOpen, onClose, eventId, eventName }: DoorStaffModalProps) {
  const [doorStaff, setDoorStaff] = useState<DoorStaff[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create invite state
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
          email: inviteEmail || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create invite");
      }

      const data = await response.json();
      setNewInviteUrl(data.invite.invite_url);
      setInviteEmail("");
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
          <div className="text-center py-8 text-foreground-muted">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-danger">{error}</div>
        ) : (
          <>
            {/* Current door staff */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Current Door Staff ({activeStaff.length})
              </h3>
              
              {activeStaff.length === 0 ? (
                <div className="text-center py-6 text-foreground-muted border border-dashed border-border rounded-lg">
                  No door staff assigned yet
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

            {/* Create invite section */}
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
                    Create Another Invite
                  </Button>
                </div>
              ) : showCreateInvite ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Create Invite Link</h3>
                  <Input
                    label="Email (optional)"
                    placeholder="staff@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    helperText="Leave blank to create a shareable link"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateInvite}
                      disabled={creatingInvite}
                      loading={creatingInvite}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Generate Invite Link
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowCreateInvite(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowCreateInvite(true)} className="w-full">
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

