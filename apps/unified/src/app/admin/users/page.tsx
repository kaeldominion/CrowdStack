"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Container, Section, Button, Input, Modal, InlineSpinner } from "@crowdstack/ui";
import {
  User, Search, Edit, Shield, Building2, Calendar, ChevronRight,
  Phone, Mail, Instagram, AlertCircle, CheckCircle, Loader2,
  Music, Megaphone, Crown, UserCheck
} from "lucide-react";
import { UserAssignmentModal } from "@/components/UserAssignmentModal";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const ROW_HEIGHT = 36;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
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

  // Debounce search input - wait 500ms and require at least 2 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if empty (show all) or at least 2 characters
      if (search === "" || search.length >= 2) {
        setDebouncedSearch(search);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset and load when search changes
  useEffect(() => {
    setUsers([]);
    setPagination(null);
    setLoading(true);
    loadUsers(1, debouncedSearch);
  }, [debouncedSearch]);

  const loadUsers = async (page: number = 1, searchQuery: string = "") => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "100",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Failed to load users");
      const data = await response.json();

      if (page === 1) {
        setUsers(data.users || []);
      } else {
        setUsers(prev => [...prev, ...(data.users || [])]);
      }
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !pagination?.hasMore) return;
    setLoadingMore(true);
    loadUsers(pagination.page + 1, debouncedSearch);
  }, [loadingMore, pagination, debouncedSearch]);

  // Virtual scrolling
  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Format date compactly
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Get role badge style
  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      superadmin: "bg-red-500/20 text-red-400 border-red-400/50",
      venue_admin: "bg-blue-500/20 text-blue-400 border-blue-400/50",
      event_organizer: "bg-purple-500/20 text-purple-400 border-purple-400/50",
      promoter: "bg-orange-500/20 text-orange-400 border-orange-400/50",
      dj: "bg-pink-500/20 text-pink-400 border-pink-400/50",
    };
    return styles[role] || "bg-white/10 text-[var(--text-secondary)] border-white/20";
  };

  // Get role short name
  const getRoleShortName = (role: string) => {
    const names: Record<string, string> = {
      superadmin: "SA",
      venue_admin: "VA",
      event_organizer: "ORG",
      promoter: "PRO",
      dj: "DJ",
    };
    return names[role] || role.slice(0, 3).toUpperCase();
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <InlineSpinner size="sm" />
          <span className="ml-2 text-sm text-[var(--text-secondary)]">Loading users...</span>
        </div>
      </Container>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--accent-secondary)]">
          User Management
        </h1>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {pagination?.total || users.length} users total
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-[var(--bg-glass)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_80px_80px_80px_24px] gap-2 px-3 py-2 bg-[var(--bg-raised)] border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          <div>Email</div>
          <div>Roles</div>
          <div className="text-center">Entities</div>
          <div>Created</div>
          <div>Last In</div>
          <div></div>
        </div>

        {/* Virtual Scrolling Container */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: Math.min(users.length * ROW_HEIGHT + 20, 600) }}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (
              target.scrollHeight - target.scrollTop - target.clientHeight < 200 &&
              pagination?.hasMore &&
              !loadingMore
            ) {
              loadMore();
            }
          }}
        >
          {users.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
              No users found
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const user = users[virtualItem.index];
                const hasProfile = !!user.profile?.name;
                const entityCount =
                  (user.venues?.length || 0) +
                  (user.organizers?.length || 0) +
                  (user.djs?.length || 0) +
                  (user.promoters?.length || 0);

                return (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1fr_120px_80px_80px_80px_24px] gap-2 items-center px-3 hover:bg-white/5 transition-colors border-b border-[var(--border-subtle)]/50 cursor-pointer"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    onClick={() => setSelectedUser(user)}
                  >
                    {/* Email & Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      {user.email ? (
                        <span className="text-xs text-[var(--text-primary)] truncate">
                          {user.email}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 italic flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          No email
                        </span>
                      )}
                      {hasProfile && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate hidden sm:inline">
                          ({user.profile.name})
                        </span>
                      )}
                    </div>

                    {/* Roles */}
                    <div className="flex items-center gap-1 overflow-hidden">
                      {(user.roles || []).slice(0, 3).map((role: string) => (
                        <span
                          key={role}
                          className={`text-[8px] px-1.5 py-0.5 rounded border font-bold tracking-wider ${getRoleBadge(role)}`}
                        >
                          {getRoleShortName(role)}
                        </span>
                      ))}
                      {(user.roles?.length || 0) > 3 && (
                        <span className="text-[8px] text-[var(--text-muted)]">
                          +{user.roles.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Entities */}
                    <div className="text-center">
                      {entityCount > 0 ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                          {entityCount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)]">-</span>
                      )}
                    </div>

                    {/* Created */}
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {formatDate(user.created_at)}
                    </div>

                    {/* Last Sign In */}
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {formatDate(user.last_sign_in_at)}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-raised)] flex items-center justify-between">
          <p className="text-[10px] text-[var(--text-muted)] font-mono">
            {users.length} of {pagination?.total || users.length} users
          </p>
          {loadingMore && (
            <div className="flex items-center gap-2">
              <InlineSpinner size="xs" />
              <span className="text-[10px] text-[var(--text-muted)]">Loading more...</span>
            </div>
          )}
        </div>
      </div>

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
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      {selectedUser.profile.name} {selectedUser.profile.surname || ""}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">{selectedUser.email}</p>
                  </>
                ) : (
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedUser.email || "No email"}</h3>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(selectedUser.roles || []).map((role: string) => (
                    <span
                      key={role}
                      className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider ${getRoleBadge(role)}`}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            {selectedUser.profile && (
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Profile Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedUser.profile.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-[var(--text-secondary)]" />
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
                        className="text-[var(--text-primary)] hover:underline"
                      >
                        @{selectedUser.profile.instagram_handle}
                      </a>
                    </div>
                  )}
                  {selectedUser.profile.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
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
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{selectedUser.profile.bio}</p>
                )}
              </div>
            )}

            {/* Assignments & Profiles */}
            {(selectedUser.venues?.length > 0 || selectedUser.organizers?.length > 0 || selectedUser.djs?.length > 0 || selectedUser.promoters?.length > 0) && (
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Entity Assignments</p>
                <div className="space-y-2">
                  {selectedUser.venues?.map((venue: any) => (
                    <div key={venue.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      <span>{venue.name}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Venue</span>
                    </div>
                  ))}
                  {selectedUser.organizers?.map((org: any) => (
                    <div key={org.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span>{org.name}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Organizer</span>
                    </div>
                  ))}
                  {selectedUser.djs?.map((dj: any) => (
                    <div key={dj.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                      <Music className="h-4 w-4 text-pink-500" />
                      <span>{dj.name}</span>
                      {dj.handle && <span className="text-[var(--text-secondary)]">@{dj.handle}</span>}
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400">DJ</span>
                    </div>
                  ))}
                  {selectedUser.promoters?.map((promoter: any) => (
                    <div key={promoter.id} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded">
                      <Megaphone className="h-4 w-4 text-orange-500" />
                      <span>{promoter.name}</span>
                      {promoter.slug && <span className="text-[var(--text-secondary)]">@{promoter.slug}</span>}
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">Promoter</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Account Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Created</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Last Sign In</p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {selectedUser.last_sign_in_at
                      ? new Date(selectedUser.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>

            {/* Name Update Section */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Name Management</p>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-sm">
                    {selectedUser.profile?.name ? (
                      <>
                        {selectedUser.profile.name}
                        {selectedUser.profile.surname && ` ${selectedUser.profile.surname}`}
                      </>
                    ) : (
                      <span className="text-amber-400 italic">No name set</span>
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
                  {selectedUser.profile?.name ? "Update" : "Set"}
                </Button>
              </div>
            </div>

            {/* Email Update Section */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Email Management</p>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-sm">
                    {selectedUser.email || (
                      <span className="text-amber-400 italic">No email set</span>
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
                  {selectedUser.email ? "Update" : "Set"}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Assign to Entity</p>
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

            <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Assignment Modal */}
      {assignmentModal && (
        <UserAssignmentModal
          isOpen={assignmentModal.open}
          onClose={() => setAssignmentModal(null)}
          userId={assignmentModal.userId}
          userEmail={assignmentModal.userEmail}
          type={assignmentModal.type}
          onAssign={() => {
            setUsers([]);
            setPagination(null);
            setLoading(true);
            loadUsers(1, debouncedSearch);
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
            <p className="text-sm text-[var(--text-secondary)]">
              {nameUpdateModal.currentName
                ? "Update the user's name. This will update the name in attendee profile, auth metadata, and promoter profile if they exist."
                : "Set a name for this user. This will create/update the attendee profile and update auth metadata."}
            </p>

            {nameUpdateModal.currentName && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Current Name
                </label>
                <div className="p-3 bg-white/5 rounded text-sm text-[var(--text-secondary)]">
                  {nameUpdateModal.currentName}
                  {nameUpdateModal.currentSurname && ` ${nameUpdateModal.currentSurname}`}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                First Name <span className="text-red-400">*</span>
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
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
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
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                {nameUpdateResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-sm ${nameUpdateResult.success ? "text-emerald-400" : "text-amber-400"}`}>
                  {nameUpdateResult.message}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
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
                        headers: { "Content-Type": "application/json" },
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

                    setTimeout(() => {
                      setUsers([]);
                      setPagination(null);
                      loadUsers(1, debouncedSearch);
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
                {updatingName ? "Updating..." : nameUpdateModal.currentName ? "Update Name" : "Set Name"}
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
            <p className="text-sm text-[var(--text-secondary)]">
              {emailUpdateModal.currentEmail
                ? "Update the user's email address. This will update the email in auth.users and related profiles."
                : "Set an email address for this user."}
            </p>

            {emailUpdateModal.currentEmail && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Current Email
                </label>
                <div className="p-3 bg-white/5 rounded text-sm text-[var(--text-secondary)]">
                  {emailUpdateModal.currentEmail}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                New Email <span className="text-red-400">*</span>
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
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                {emailUpdateResult.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <p className={`text-sm ${emailUpdateResult.success ? "text-emerald-400" : "text-amber-400"}`}>
                  {emailUpdateResult.message}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
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
                        headers: { "Content-Type": "application/json" },
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

                    setTimeout(() => {
                      setUsers([]);
                      setPagination(null);
                      loadUsers(1, debouncedSearch);
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
