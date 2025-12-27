"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal, LoadingSpinner } from "@crowdstack/ui";
import { User, Search, Edit, Shield, Building2, Calendar, ChevronRight, Phone, Mail, Instagram, MapPin } from "lucide-react";
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
          u.email.toLowerCase().includes(searchLower) ||
          u.roles?.some((r: string) => r.toLowerCase().includes(searchLower))
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
            <h1 className="text-3xl font-bold text-primary">User Management</h1>
            <p className="mt-2 text-sm text-secondary">
              Manage users and their roles
            </p>
          </div>

          <Card>
            <div className="p-6">
              <Input
                placeholder="Search users by email or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </Card>

          <div className="mt-4 text-sm text-secondary">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          <Card>
            <div className="overflow-x-auto">
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
                        <TableCell className="font-medium">{user.email}</TableCell>
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
    </div>
  );
}

