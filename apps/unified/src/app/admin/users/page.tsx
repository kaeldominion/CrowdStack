"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Modal } from "@crowdstack/ui";
import { User, Search, Edit, Shield, Building2, Calendar, ChevronRight } from "lucide-react";
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
          <div className="text-foreground-muted">Loading users...</div>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="lg">
        <Container>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="mt-2 text-sm text-foreground-muted">
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

          <div className="mt-4 text-sm text-foreground-muted">
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
                      <TableCell colSpan={5} className="text-center py-8 text-foreground-muted">
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
                        <TableCell className="text-sm text-foreground-muted">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-foreground-muted">
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-foreground-muted" />
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
            size="md"
          >
            {selectedUser && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedUser.email}</h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getRoleBadges(selectedUser.roles || [])}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Created</p>
                    <p className="text-sm text-foreground">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Last Sign In</p>
                    <p className="text-sm text-foreground">
                      {selectedUser.last_sign_in_at
                        ? new Date(selectedUser.last_sign_in_at).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground mb-3">Assign to Entity</p>
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

