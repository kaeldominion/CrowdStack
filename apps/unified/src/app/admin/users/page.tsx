"use client";

import { useState, useEffect } from "react";
import { Card, Container, Section, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@crowdstack/ui";
import { User, Search, Edit, Shield, Building2, Calendar } from "lucide-react";
import { UserAssignmentModal } from "@/components/UserAssignmentModal";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
                    <TableHead>Actions</TableHead>
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
                      <TableRow key={user.id} hover>
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
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignmentModal({
                                open: true,
                                userId: user.id,
                                userEmail: user.email,
                                type: "venue",
                              })}
                              title="Assign to Venues"
                            >
                              <Building2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAssignmentModal({
                                open: true,
                                userId: user.id,
                                userEmail: user.email,
                                type: "organizer",
                              })}
                              title="Assign to Organizers"
                            >
                              <Calendar className="h-4 w-4" />
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

