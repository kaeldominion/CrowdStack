"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal, LoadingSpinner } from "@crowdstack/ui";
import { User, Search, Edit, Shield, Building2, Calendar, ChevronRight, Phone, Mail, Instagram, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { UserAssignmentModal } from "@/components/UserAssignmentModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    userId: string;
    userEmail: string;
    type: "venue" | "organizer";
  } | null>(null);
  const [emailUpdateModal, setEmailUpdateModal] = useState<{
    open: boolean;
    userId: string;
    currentEmail: string | null;
  } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailUpdateResult, setEmailUpdateResult] = useState<{ success: boolean; message: string } | null>(null);
  const [nameUpdateModal, setNameUpdateModal] = useState<{
    open: boolean;
    userId: string;
    currentName: string | null;
    currentSurname: string | null;
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [nameUpdateResult, setNameUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [search, users]);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.email && u.email.toLowerCase().includes(searchLower)) ||
          u.roles?.some((r: string) => r.toLowerCase().includes(searchLower)) ||
          u.profile?.name?.toLowerCase().includes(searchLower)
      );
    }
    setFilteredUsers(filtered);
  };

  const getRoleBadges = (roles: string[]) => {
    return roles.map((role) => (
      <Badge key={role} variant={role === "superadmin" ? "error" : "primary"} className="mr-1">
        {role}
      </Badge>
    ));
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner text="Loading users..." />
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen">
      <Section spacing="lg">
        <Container>
          <div className="mb-6">
            <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">User Management</h1>
            <p className="text-sm text-secondary">
              Manage users and their roles
            </p>
          </div>

          <Card className="!p-4">
            <Input
              placeholder="Search users by email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </Card>

          <div className="mt-4 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-secondary">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow 
                        key={user.id} 
                        hover
                        className="cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.email ? (
                              user.email
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-warning" />
                                <span className="text-warning italic">No email</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getRoleBadges(user.roles || [])}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-secondary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-secondary">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-secondary" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* User Detail Modal */}
          <Modal
            isOpen={!!selectedUser}
            onClose={() => setSelectedUser(null)}
            title="User Details"
            size="lg"
          >
            {selectedUser && (
              <div className="space-y-6">
                {/* Header with Avatar */}
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedUser.profile?.avatar_url ? (
                      <img 
                        src={selectedUser.profile.avatar_url} 
                        alt={selectedUser.profile.name || selectedUser.email}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {(selectedUser.profile?.name || selectedUser.email)?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {selectedUser.profile?.name ? (
                      <>
                        <h3 className="text-xl font-bold text-primary">
                          {selectedUser.profile.name} {selectedUser.profile.surname || ""}
                        </h3>
                        <p className="text-sm text-secondary">{selectedUser.email}</p>
                      </>
                    ) : (
                      <h3 className="text-xl font-bold text-primary">{selectedUser.email}</h3>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getRoleBadges(selectedUser.roles || [])}
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                {selectedUser.profile && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-primary mb-3">Profile Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedUser.profile.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-secondary" />
                          <span>{selectedUser.profile.phone}</span>
                        </div>
                      )}
                      {selectedUser.profile.whatsapp && selectedUser.profile.whatsapp !== selectedUser.profile.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-green-500" />
                          <span>WhatsApp: {selectedUser.profile.whatsapp}</span>
                        </div>
                      )}
                      {selectedUser.profile.instagram_handle && (
                        <div className="flex items-center gap-2 text-sm">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          <a 
                            href={`https://instagram.com/${selectedUser.profile.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{selectedUser.profile.instagram_handle}
                          </a>
                        </div>
                      )}
                      {selectedUser.profile.date_of_birth && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-secondary" />
                          <span>
                            {new Date(selectedUser.profile.date_of_birth).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    {selectedUser.profile.bio && (
                      <p className="mt-3 text-sm text-secondary">{selectedUser.profile.bio}</p>
                    )}
                  </div>
                )}

                {/* Assignments */}
                {(selectedUser.venues?.length > 0 || selectedUser.organizers?.length > 0) && (
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-primary mb-3">Current Assignments</p>
                    <div className="space-y-2">
                      {selectedUser.venues?.map((venue: any) => (
                        <div key={venue.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          <span>{venue.name}</span>
                          <Badge variant="secondary" className="ml-auto">Venue</Badge>
                        </div>
                      ))}
                      {selectedUser.organizers?.map((org: any) => (
                        <div key={org.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                          <Calendar className="h-4 w-4 text-purple-500" />
                          <span>{org.name}</span>
                          <Badge variant="secondary" className="ml-auto">Organizer</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Info */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Account Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-secondary uppercase tracking-wider">Created</p>
                      <p className="text-sm text-primary">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary uppercase tracking-wider">Last Sign In</p>
                      <p className="text-sm text-primary">
                        {selectedUser.last_sign_in_at
                          ? new Date(selectedUser.last_sign_in_at).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name Update Section */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Name Management</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-secondary" />
                        <span className="text-sm">
                          {selectedUser.profile?.name ? (
                            <>
                              {selectedUser.profile.name}
                              {selectedUser.profile.surname && ` ${selectedUser.profile.surname}`}
                            </>
                          ) : (
                            <span className="text-warning italic">No name set</span>
                          )}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setNameUpdateModal({
                            open: true,
                            userId: selectedUser.id,
                            currentName: selectedUser.profile?.name || null,
                            currentSurname: selectedUser.profile?.surname || null,
                          });
                          setNewName(selectedUser.profile?.name || "");
                          setNewSurname(selectedUser.profile?.surname || "");
                          setNameUpdateResult(null);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {selectedUser.profile?.name ? "Update Name" : "Set Name"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email Update Section */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Email Management</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-secondary" />
                        <span className="text-sm">
                          {selectedUser.email || (
                            <span className="text-warning italic">No email set</span>
                          )}
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEmailUpdateModal({
                            open: true,
                            userId: selectedUser.id,
                            currentEmail: selectedUser.email || null,
                          });
                          setNewEmail(selectedUser.email || "");
                          setEmailUpdateResult(null);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {selectedUser.email ? "Update Email" : "Set Email"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-primary mb-3">Assign to Entity</p>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedUser(null);
                        setAssignmentModal({
                          open: true,
                          userId: selectedUser.id,
                          userEmail: selectedUser.email,
                          type: "venue",
                        });
                      }}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Assign to Venues
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedUser(null);
                        setAssignmentModal({
                          open: true,
                          userId: selectedUser.id,
                          userEmail: selectedUser.email,
                          type: "organizer",
                        });
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Assign to Organizers
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </Container>
      </Section>

      {/* User Assignment Modal */}
      {assignmentModal && (
        <UserAssignmentModal
          isOpen={assignmentModal.open}
          onClose={() => setAssignmentModal(null)}
          userId={assignmentModal.userId}
          userEmail={assignmentModal.userEmail}
          type={assignmentModal.type}
          onAssign={() => {
            loadUsers(); // Refresh users list
          }}
        />
      )}

      {/* Name Update Modal */}
      <Modal
        isOpen={!!nameUpdateModal}
        onClose={() => {
          setNameUpdateModal(null);
          setNewName("");
          setNewSurname("");
          setNameUpdateResult(null);
        }}
        title={nameUpdateModal?.currentName ? "Update User Name" : "Set User Name"}
        size="md"
      >
        {nameUpdateModal && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              {nameUpdateModal.currentName
                ? "Update the user's name. This will update the name in attendee profile, auth metadata, and promoter profile if they exist."
                : "Set a name for this user. This will create/update the attendee profile and update auth metadata."}
            </p>

            {nameUpdateModal.currentName && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Current Name
                </label>
                <div className="p-3 bg-white/5 rounded text-sm text-secondary">
                  {nameUpdateModal.currentName}
                  {nameUpdateModal.currentSurname && ` ${nameUpdateModal.currentSurname}`}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="John"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={updatingName}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Last Name (optional)
              </label>
              <Input
                type="text"
                placeholder="Doe"
                value={newSurname}
                onChange={(e) => setNewSurname(e.target.value)}
                disabled={updatingName}
              />
            </div>

            {nameUpdateResult && (
              <div
                className={`flex items-start gap-3 p-3 rounded ${
                  nameUpdateResult.success
                    ? "bg-success/10 border border-success/20"
                    : "bg-warning/10 border border-warning/20"
                }`}
              >
                {nameUpdateResult.success ? (
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    nameUpdateResult.success ? "text-success" : "text-warning"
                  }`}
                >
                  {nameUpdateResult.message}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setNameUpdateModal(null);
                  setNewName("");
                  setNewSurname("");
                  setNameUpdateResult(null);
                }}
                disabled={updatingName}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newName.trim()) {
                    setNameUpdateResult({
                      success: false,
                      message: "First name is required",
                    });
                    return;
                  }

                  setUpdatingName(true);
                  setNameUpdateResult(null);

                  try {
                    const response = await fetch(
                      `/api/admin/users/${nameUpdateModal.userId}/update-name`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          name: newName.trim(),
                          surname: newSurname.trim() || null,
                        }),
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || "Failed to update name");
                    }

                    setNameUpdateResult({
                      success: true,
                      message: data.message || "Name updated successfully",
                    });

                    // Refresh users list after a short delay
                    setTimeout(() => {
                      loadUsers();
                      // Update selected user if it's the same user
                      if (selectedUser?.id === nameUpdateModal.userId) {
                        setSelectedUser({
                          ...selectedUser,
                          profile: {
                            ...selectedUser.profile,
                            name: newName.trim(),
                            surname: newSurname.trim() || null,
                          },
                        });
                      }
                    }, 1000);
                  } catch (error: any) {
                    setNameUpdateResult({
                      success: false,
                      message: error.message || "Failed to update name",
                    });
                  } finally {
                    setUpdatingName(false);
                  }
                }}
                disabled={updatingName || !newName.trim()}
              >
                {updatingName
                  ? "Updating..."
                  : nameUpdateModal.currentName
                  ? "Update Name"
                  : "Set Name"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email Update Modal */}
      <Modal
        isOpen={!!emailUpdateModal}
        onClose={() => {
          setEmailUpdateModal(null);
          setNewEmail("");
          setEmailUpdateResult(null);
        }}
        title={emailUpdateModal?.currentEmail ? "Update User Email" : "Set User Email"}
        size="md"
      >
        {emailUpdateModal && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              {emailUpdateModal.currentEmail
                ? "Update the user's email address. This will update the email in auth.users and related profiles (promoter, attendee) if they exist."
                : "Set an email address for this user. This will create the email in auth.users and update related profiles (promoter, attendee) if they exist."}
            </p>

            {emailUpdateModal.currentEmail && (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Current Email
                </label>
                <div className="p-3 bg-white/5 rounded text-sm text-secondary">
                  {emailUpdateModal.currentEmail}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                New Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={updatingEmail}
              />
            </div>

            {emailUpdateResult && (
              <div
                className={`flex items-start gap-3 p-3 rounded ${
                  emailUpdateResult.success
                    ? "bg-success/10 border border-success/20"
                    : "bg-warning/10 border border-warning/20"
                }`}
              >
                {emailUpdateResult.success ? (
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    emailUpdateResult.success ? "text-success" : "text-warning"
                  }`}
                >
                  {emailUpdateResult.message}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailUpdateModal(null);
                  setNewEmail("");
                  setEmailUpdateResult(null);
                }}
                disabled={updatingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newEmail.trim()) {
                    setEmailUpdateResult({
                      success: false,
                      message: "Email is required",
                    });
                    return;
                  }

                  // Validate email format
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(newEmail.trim())) {
                    setEmailUpdateResult({
                      success: false,
                      message: "Invalid email format",
                    });
                    return;
                  }

                  setUpdatingEmail(true);
                  setEmailUpdateResult(null);

                  try {
                    const response = await fetch(
                      `/api/admin/users/${emailUpdateModal.userId}/update-email`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email: newEmail.trim() }),
                      }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || "Failed to update email");
                    }

                    setEmailUpdateResult({
                      success: true,
                      message: data.message || "Email updated successfully",
                    });

                    // Refresh users list after a short delay
                    setTimeout(() => {
                      loadUsers();
                      // Update selected user if it's the same user
                      if (selectedUser?.id === emailUpdateModal.userId) {
                        setSelectedUser({
                          ...selectedUser,
                          email: newEmail.trim(),
                        });
                      }
                    }, 1000);
                  } catch (error: any) {
                    setEmailUpdateResult({
                      success: false,
                      message: error.message || "Failed to update email",
                    });
                  } finally {
                    setUpdatingEmail(false);
                  }
                }}
                disabled={updatingEmail || !newEmail.trim()}
              >
                {updatingEmail ? "Updating..." : emailUpdateModal.currentEmail ? "Update Email" : "Set Email"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

