"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
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
  Card,
} from "@crowdstack/ui";
import { Plus, Trash2, Edit, Users, Mail, User } from "lucide-react";
import { PermissionsEditor } from "@/components/PermissionsEditor";
import { PermanentDoorStaffSection } from "@/components/PermanentDoorStaffSection";
import type { VenueUser, VenuePermissions } from "@crowdstack/shared/types";
import { DEFAULT_VENUE_PERMISSIONS } from "@crowdstack/shared/constants/permissions";

export default function VenueUsersPage() {
  const searchParams = useSearchParams();
  const venueIdParam = searchParams.get("venueId");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<VenueUser[]>([]);
  const [venueId, setVenueId] = useState<string | null>(venueIdParam);
  const [venueName, setVenueName] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<VenueUser | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPermissions, setNewUserPermissions] =
    useState<VenuePermissions>(DEFAULT_VENUE_PERMISSIONS);

  useEffect(() => {
    loadUsers();
  }, [venueIdParam]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const url = venueIdParam 
        ? `/api/venue/users?venueId=${venueIdParam}`
        : `/api/venue/users`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to load users" }));
        throw new Error(errorData.error || "Failed to load users");
      }
      const data = await response.json();
      setUsers(data.users || []);
      // Store the venue info from the API response
      if (data.venue_id) {
        setVenueId(data.venue_id);
      }
      if (data.venue_name) {
        setVenueName(data.venue_name);
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      alert(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail) {
      alert("Please enter an email address");
      return;
    }

    try {
      const body: any = {
        email: newUserEmail,
        permissions: newUserPermissions,
      };
      
      // Include venueId if we have it, otherwise let API figure it out
      if (venueId) {
        body.venueId = venueId;
      }

      const response = await fetch(`/api/venue/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add user");
      }

      await loadUsers();
      setShowAddModal(false);
      setNewUserEmail("");
      setNewUserPermissions(DEFAULT_VENUE_PERMISSIONS);
    } catch (error: any) {
      alert(error.message || "Failed to add user");
    }
  };

  const handleUpdatePermissions = async (
    userId: string,
    permissions: VenuePermissions
  ) => {
    try {
      const body: any = { permissions };
      
      // Include venueId if we have it, otherwise let API figure it out
      if (venueId) {
        body.venueId = venueId;
      }

      const response = await fetch(`/api/venue/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update permissions");
      }

      await loadUsers();
      setEditingUser(null);
    } catch (error: any) {
      alert(error.message || "Failed to update permissions");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return;

    try {
      const url = venueId 
        ? `/api/venue/users/${userId}?venueId=${venueId}`
        : `/api/venue/users/${userId}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove user");
      }

      await loadUsers();
    } catch (error: any) {
      alert(error.message || "Failed to remove user");
    }
  };

  const getPermissionBadges = (permissions: VenuePermissions) => {
    if (permissions.full_admin) {
      return <Badge variant="primary">Full Admin</Badge>;
    }

    const activePermissions = Object.entries(permissions)
      .filter(([key, value]) => key !== "full_admin" && value === true)
      .map(([key]) => key);

    if (activePermissions.length === 0) {
      return <Badge variant="secondary">No Permissions</Badge>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {activePermissions.slice(0, 3).map((perm) => (
          <Badge key={perm} variant="secondary" size="sm">
            {perm.replace(/_/g, " ")}
          </Badge>
        ))}
        {activePermissions.length > 3 && (
          <Badge variant="secondary" size="sm">
            +{activePermissions.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="h-6 w-6 text-[var(--accent-secondary)]" />
            Team
          </h1>
          <p className="page-description">
            Manage users who can access this venue and their permissions
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add User
        </Button>
      </div>

      <div className="glass-panel overflow-hidden">
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
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-secondary"
                      >
                        No users assigned yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((venueUser) => (
                      <TableRow key={venueUser.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-secondary" />
                            <div>
                              <div className="font-medium">
                                {(venueUser.user as any)?.name || venueUser.user?.email || "Unknown"}
                              </div>
                              {venueUser.user?.email && (
                                <div className="text-xs text-secondary flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {venueUser.user.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPermissionBadges(venueUser.permissions)}
                        </TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(venueUser.assigned_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(venueUser)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(venueUser.user_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
      </div>

      {/* Add User Modal */}
          <Modal
            isOpen={showAddModal}
            onClose={() => {
              setShowAddModal(false);
              setNewUserEmail("");
              setNewUserPermissions(DEFAULT_VENUE_PERMISSIONS);
            }}
            title="Add User to Venue"
            size="lg"
          >
            <div className="space-y-6">
              <Input
                label="User Email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />

              <Card>
                <PermissionsEditor
                  permissions={newUserPermissions}
                  onChange={(perms) =>
                    setNewUserPermissions(perms as VenuePermissions)
                  }
                  type="venue"
                />
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUserEmail("");
                    setNewUserPermissions(DEFAULT_VENUE_PERMISSIONS);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddUser}>
                  Add User
                </Button>
              </div>
            </div>
          </Modal>

          {/* Door Staff Section - only show when we have a venue */}
          {venueId && (
            <div className="mt-8">
              <PermanentDoorStaffSection 
                type="venue" 
                entityId={venueId}
                entityName={venueName}
              />
            </div>
          )}

          {/* Edit Permissions Modal */}
          {editingUser && (
            <Modal
              isOpen={!!editingUser}
              onClose={() => setEditingUser(null)}
              title="Edit User Permissions"
              size="lg"
            >
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-secondary mb-1">User</p>
                  <p className="font-medium">{editingUser.user?.email}</p>
                </div>

                <Card>
                  <PermissionsEditor
                    permissions={editingUser.permissions}
                    onChange={(perms) =>
                      handleUpdatePermissions(
                        editingUser.user_id,
                        perms as VenuePermissions
                      )
                    }
                    type="venue"
                  />
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setEditingUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Modal>
          )}
    </div>
  );
}

