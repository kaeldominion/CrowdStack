"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import { Plus, Trash2, Edit, User as UserIcon, Mail } from "lucide-react";
import { PermissionsEditor } from "@/components/PermissionsEditor";
import { PermanentDoorStaffSection } from "@/components/PermanentDoorStaffSection";
import type { VenueUser, VenuePermissions } from "@crowdstack/shared/types";
import { DEFAULT_VENUE_PERMISSIONS } from "@crowdstack/shared/constants/permissions";

export default function AdminVenueTeamPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<VenueUser[]>([]);
  const [venueName, setVenueName] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<VenueUser | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPermissions, setNewUserPermissions] =
    useState<VenuePermissions>(DEFAULT_VENUE_PERMISSIONS);

  useEffect(() => {
    loadUsers();
  }, [venueId]);

  const loadUsers = async () => {
    try {
      const response = await fetch(`/api/venue/users?venueId=${venueId}`);
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(data.users || []);
      setVenueName(data.venueName || "");
    } catch (error) {
      console.error("Error loading venue users:", error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUserEmail.trim()) return;

    try {
      const response = await fetch(`/api/venue/users?venueId=${venueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          permissions: newUserPermissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add user");
      }

      setNewUserEmail("");
      setNewUserPermissions(DEFAULT_VENUE_PERMISSIONS);
      setShowAddModal(false);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateUserPermissions = async (
    userId: string,
    permissions: VenuePermissions
  ) => {
    try {
      const response = await fetch(`/api/venue/users/${userId}?venueId=${venueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update permissions");
      }

      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const removeUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the venue?")) {
      return;
    }

    try {
      const response = await fetch(`/api/venue/users/${userId}?venueId=${venueId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove user");
      }

      loadUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatPermissions = (permissions: VenuePermissions) => {
    const active = Object.entries(permissions)
      .filter(([_, value]) => value)
      .map(([key]) => key.replace("_", " "));

    if (active.length === 0) return "No permissions";
    if (active.length > 3) return `${active.length} permissions`;
    return active.join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading team..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Team Members</h2>
          <p className="text-sm text-secondary">
            Manage users who can access this venue
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-secondary">
                    No team members yet
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent-primary/10 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-accent-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-primary">{user.email}</p>
                          {user.user_name && (
                            <p className="text-sm text-secondary">{user.user_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {formatPermissions(user.permissions || DEFAULT_VENUE_PERMISSIONS)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-secondary">
                      {user.assigned_at
                        ? new Date(user.assigned_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-accent-error" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Permanent Door Staff Section */}
      <PermanentDoorStaffSection type="venue" entityId={venueId} />

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewUserEmail("");
          setNewUserPermissions(DEFAULT_VENUE_PERMISSIONS);
        }}
        title="Add Team Member"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Email Address
            </label>
            <Input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-secondary mt-1">
              The user must have an account. If they don't, they'll be invited.
            </p>
          </div>

          <PermissionsEditor
            type="venue"
            permissions={newUserPermissions}
            onChange={(p) => setNewUserPermissions(p as VenuePermissions)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={addUser} disabled={!newUserEmail.trim()}>
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit Permissions - ${editingUser?.email}`}
      >
        {editingUser && (
          <div className="space-y-4">
            <PermissionsEditor
              type="venue"
              permissions={editingUser.permissions || DEFAULT_VENUE_PERMISSIONS}
              onChange={(permissions) =>
                setEditingUser({ ...editingUser, permissions: permissions as VenuePermissions })
              }
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateUserPermissions(
                    editingUser.id,
                    editingUser.permissions || DEFAULT_VENUE_PERMISSIONS
                  )
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
