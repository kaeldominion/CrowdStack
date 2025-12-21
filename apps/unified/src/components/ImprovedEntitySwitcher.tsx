"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Dropdown, Modal, Input, LoadingSpinner } from "@crowdstack/ui";
import { Building2, Calendar, Users, User, Shield, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { UserRole } from "@crowdstack/shared";

const IMPERSONATION_COOKIE = "cs-impersonate-role";
const IMPERSONATION_ENTITY_COOKIE = "cs-impersonate-entity-id";
const ITEMS_PER_PAGE = 20;

interface Entity {
  id: string;
  name: string;
  email?: string | null;
  role: UserRole;
}

export function ImprovedEntitySwitcher({ userRoles }: { userRoles: UserRole[] }) {
  const [impersonatingRole, setImpersonatingRole] = useState<UserRole | "all" | null>(null);
  const [impersonatingEntityId, setImpersonatingEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Only show for superadmin
  if (!userRoles.includes("superadmin")) {
    return null;
  }

  useEffect(() => {
    // Read impersonation from cookies
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${IMPERSONATION_COOKIE}=`));
    
    const entityCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${IMPERSONATION_ENTITY_COOKIE}=`));

    if (roleCookie) {
      const role = roleCookie.split("=")[1];
      if (role === "all" || ["venue_admin", "event_organizer", "promoter", "attendee"].includes(role)) {
        setImpersonatingRole(role as UserRole | "all");
      } else {
        setImpersonatingRole("all");
      }
    } else {
      setImpersonatingRole("all");
    }

    if (entityCookie) {
      setImpersonatingEntityId(entityCookie.split("=")[1]);
    }
  }, []);

  const loadEntities = async (role: UserRole, page: number = 1, search: string = "") => {
    setLoading(true);
    setShowModal(true);
    setSearchQuery(search);
    setCurrentPage(page);
    setImpersonatingRole(role); // Set the role being loaded
    
    try {
      let data: Entity[] = [];
      let count = 0;

      // Use admin API endpoints that bypass RLS
      switch (role) {
        case "venue_admin": {
          const response = await fetch("/api/admin/venues");
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load venues");
          }
          const json = await response.json();
          let venues = json.venues || [];
          // Filter by search if provided
          if (search) {
            const searchLower = search.toLowerCase();
            venues = venues.filter((v: any) => 
              v.name?.toLowerCase().includes(searchLower) || 
              v.email?.toLowerCase().includes(searchLower)
            );
          }
          // Sort by name
          venues.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
          count = venues.length;
          // Apply pagination
          const startIdx = (page - 1) * ITEMS_PER_PAGE;
          const endIdx = startIdx + ITEMS_PER_PAGE;
          data = venues.slice(startIdx, endIdx).map((v: any) => ({ ...v, role: "venue_admin" as UserRole }));
          break;
        }
        case "event_organizer": {
          const response = await fetch("/api/admin/organizers");
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load organizers");
          }
          const json = await response.json();
          let organizers = json.organizers || [];
          // Filter by search if provided
          if (search) {
            const searchLower = search.toLowerCase();
            organizers = organizers.filter((o: any) => 
              o.name?.toLowerCase().includes(searchLower) || 
              o.email?.toLowerCase().includes(searchLower)
            );
          }
          // Sort by name
          organizers.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
          count = organizers.length;
          // Apply pagination
          const startIdx = (page - 1) * ITEMS_PER_PAGE;
          const endIdx = startIdx + ITEMS_PER_PAGE;
          data = organizers.slice(startIdx, endIdx).map((o: any) => ({ ...o, role: "event_organizer" as UserRole }));
          break;
        }
        case "promoter": {
          const response = await fetch("/api/admin/promoters");
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load promoters");
          }
          const json = await response.json();
          let promoters = json.promoters || [];
          // Filter by search if provided
          if (search) {
            const searchLower = search.toLowerCase();
            promoters = promoters.filter((p: any) => 
              p.name?.toLowerCase().includes(searchLower) || 
              p.email?.toLowerCase().includes(searchLower)
            );
          }
          // Sort by name
          promoters.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
          count = promoters.length;
          // Apply pagination
          const startIdx = (page - 1) * ITEMS_PER_PAGE;
          const endIdx = startIdx + ITEMS_PER_PAGE;
          data = promoters.slice(startIdx, endIdx).map((p: any) => ({ ...p, role: "promoter" as UserRole }));
          break;
        }
        case "attendee": {
          const response = await fetch("/api/admin/attendees");
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load attendees");
          }
          const json = await response.json();
          let attendees = json.attendees || [];
          // Filter by search if provided
          if (search) {
            const searchLower = search.toLowerCase();
            attendees = attendees.filter((a: any) => 
              a.name?.toLowerCase().includes(searchLower) || 
              a.email?.toLowerCase().includes(searchLower)
            );
          }
          // Sort by name
          attendees.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
          count = attendees.length;
          // Apply pagination
          const startIdx = (page - 1) * ITEMS_PER_PAGE;
          const endIdx = startIdx + ITEMS_PER_PAGE;
          data = attendees.slice(startIdx, endIdx).map((a: any) => ({ ...a, role: "attendee" as UserRole }));
          break;
        }
      }

      setEntities(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to load entities:", error);
    } finally {
      setLoading(false);
    }
  };

  const setImpersonation = (role: UserRole | "all", entityId?: string) => {
    if (role === "all") {
      document.cookie = `${IMPERSONATION_COOKIE}=; path=/; max-age=0`;
      document.cookie = `${IMPERSONATION_ENTITY_COOKIE}=; path=/; max-age=0`;
      setImpersonatingRole("all");
      setImpersonatingEntityId(null);
    } else {
      document.cookie = `${IMPERSONATION_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24}`;
      if (entityId) {
        document.cookie = `${IMPERSONATION_ENTITY_COOKIE}=${entityId}; path=/; max-age=${60 * 60 * 24}`;
        setImpersonatingEntityId(entityId);
      }
      setImpersonatingRole(role);
    }
    
    setShowModal(false);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleRoleClick = (role: UserRole) => {
    if (role === "attendee" || role === "venue_admin" || role === "event_organizer" || role === "promoter") {
      loadEntities(role, 1, "");
    } else {
      setImpersonation(role);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (impersonatingRole && impersonatingRole !== "all") {
      loadEntities(impersonatingRole, 1, query);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (!impersonatingRole) {
    return null;
  }

  const currentEntity = entities.find((e) => e.id === impersonatingEntityId);

  return (
    <div className="relative">
      <Dropdown
        trigger={
          <>
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">
              {impersonatingRole === "all"
                ? "All Roles (Superadmin)"
                : currentEntity
                ? `Viewing as: ${currentEntity.name}`
                : `Viewing as: ${impersonatingRole.replace(/_/g, " ")}`}
            </span>
            <span className="sm:hidden">Switch</span>
          </>
        }
        triggerClassName="px-3 py-1.5 text-sm rounded-sm bg-surface text-foreground border border-border hover:bg-surface/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background font-medium transition-all duration-200"
        items={[
          {
            label: "All Roles (Superadmin)",
            icon: <Shield className="h-4 w-4" />,
            onClick: () => setImpersonation("all"),
            active: impersonatingRole === "all",
          },
          {
            label: "View as Venue Admin...",
            icon: <Building2 className="h-4 w-4" />,
            onClick: () => handleRoleClick("venue_admin"),
          },
          {
            label: "View as Event Organizer...",
            icon: <Calendar className="h-4 w-4" />,
            onClick: () => handleRoleClick("event_organizer"),
          },
          {
            label: "View as Promoter...",
            icon: <Users className="h-4 w-4" />,
            onClick: () => handleRoleClick("promoter"),
          },
          {
            label: "View as Attendee...",
            icon: <User className="h-4 w-4" />,
            onClick: () => handleRoleClick("attendee"),
          },
        ]}
      />

      {/* Entity Selection Modal with Pagination */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={(() => {
            // Better labels for each role type
            const getRoleLabel = (role: UserRole | "all" | null) => {
              switch (role) {
                case "venue_admin": return "Venue";
                case "event_organizer": return "Event Organizer";
                case "promoter": return "Promoter";
                case "attendee": return "Attendee";
                default: return role?.replace(/_/g, " ") || "Entity";
              }
            };
            return `Select ${getRoleLabel(impersonatingRole)} to View As`;
          })()}
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner text="Loading entities..." size="md" />
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center py-8 text-foreground-muted">
                {(() => {
                  // Better labels for each role type
                  const getEntityLabel = (role: UserRole | "all" | null) => {
                    switch (role) {
                      case "venue_admin": return "venues";
                      case "event_organizer": return "organizers";
                      case "promoter": return "promoters";
                      case "attendee": return "attendees";
                      default: return role?.replace(/_/g, " ") + "s" || "items";
                    }
                  };
                  return `No ${getEntityLabel(impersonatingRole)} found${searchQuery ? ` matching "${searchQuery}"` : ""}`;
                })()}
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {entities.map((entity) => (
                    <button
                      key={entity.id}
                      onClick={() => setImpersonation(entity.role, entity.id)}
                      className="w-full text-left p-3 rounded-md border border-border hover:bg-background transition-colors"
                    >
                      <div className="font-medium text-foreground">{entity.name}</div>
                      {entity.email && (
                        <div className="text-sm text-foreground-muted">{entity.email}</div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm text-foreground-muted">
                      Page {currentPage} of {totalPages} ({totalCount} total)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadEntities(impersonatingRole as UserRole, currentPage - 1, searchQuery)}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadEntities(impersonatingRole as UserRole, currentPage + 1, searchQuery)}
                        disabled={currentPage >= totalPages || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Active impersonation banner */}
      {impersonatingRole !== "all" && impersonatingEntityId && (
        <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-md text-xs text-warning">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>
              Viewing as: {currentEntity?.name || impersonatingRole.replace(/_/g, " ")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 px-1 ml-auto"
              onClick={() => setImpersonation("all")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get the impersonated role and entity from cookies (for server components)
 */
export function getImpersonation(): { role: UserRole | "all" | null; entityId: string | null } {
  if (typeof window === "undefined") {
    return { role: null, entityId: null };
  }

  const roleCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${IMPERSONATION_COOKIE}=`));

  const entityCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${IMPERSONATION_ENTITY_COOKIE}=`));

  let role: UserRole | "all" | null = null;
  if (roleCookie) {
    const roleValue = roleCookie.split("=")[1];
    if (roleValue === "all" || ["venue_admin", "event_organizer", "promoter", "attendee"].includes(roleValue)) {
      role = roleValue as UserRole | "all";
    }
  }
  if (!role) role = "all";

  const entityId = entityCookie ? entityCookie.split("=")[1] : null;

  return { role, entityId };
}

