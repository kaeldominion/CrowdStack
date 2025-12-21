"use client";

import { useState, useEffect } from "react";
import { Button, Dropdown, Modal, LoadingSpinner } from "@crowdstack/ui";
import { Building2, Calendar, Users, User, Shield, X, Search } from "lucide-react";
import type { UserRole } from "@crowdstack/shared";
import { createBrowserClient } from "@crowdstack/shared";

const IMPERSONATION_COOKIE = "cs-impersonate-role";
const IMPERSONATION_ENTITY_COOKIE = "cs-impersonate-entity-id";

interface Entity {
  id: string;
  name: string;
  email?: string | null;
  role: UserRole;
}

export function EntitySwitcher({ userRoles }: { userRoles: UserRole[] }) {
  const [impersonatingRole, setImpersonatingRole] = useState<UserRole | "all" | null>(null);
  const [impersonatingEntityId, setImpersonatingEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const loadEntities = async (role: UserRole) => {
    setLoading(true);
    setShowModal(true);
    setSearchQuery("");
    
    try {
      const supabase = createBrowserClient();
      let data: Entity[] = [];

      switch (role) {
        case "venue_admin": {
          const { data: venues } = await supabase
            .from("venues")
            .select("id, name, email")
            .order("name");
          data = (venues || []).map(v => ({ ...v, role: "venue_admin" as UserRole }));
          break;
        }
        case "event_organizer": {
          const { data: organizers } = await supabase
            .from("organizers")
            .select("id, name, email")
            .order("name");
          data = (organizers || []).map(o => ({ ...o, role: "event_organizer" as UserRole }));
          break;
        }
        case "promoter": {
          const { data: promoters } = await supabase
            .from("promoters")
            .select("id, name, email")
            .order("name");
          data = (promoters || []).map(p => ({ ...p, role: "promoter" as UserRole }));
          break;
        }
        case "attendee": {
          const { data: attendees } = await supabase
            .from("attendees")
            .select("id, name, email")
            .limit(100)
            .order("name");
          data = (attendees || []).map(a => ({ ...a, role: "attendee" as UserRole }));
          break;
        }
      }

      setEntities(data);
    } catch (error) {
      console.error("Failed to load entities:", error);
    } finally {
      setLoading(false);
    }
  };

  const setImpersonation = (role: UserRole | "all", entityId?: string) => {
    console.log("[EntitySwitcher] Setting impersonation:", { role, entityId });
    
    // Set cookies to persist across page reloads
    if (role === "all") {
      const cookie1 = `${IMPERSONATION_COOKIE}=; path=/; max-age=0`;
      const cookie2 = `${IMPERSONATION_ENTITY_COOKIE}=; path=/; max-age=0`;
      console.log("[EntitySwitcher] Clearing cookies:", { cookie1, cookie2 });
      document.cookie = cookie1;
      document.cookie = cookie2;
      setImpersonatingRole("all");
      setImpersonatingEntityId(null);
    } else {
      const roleCookie = `${IMPERSONATION_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24}`; // 24 hours
      console.log("[EntitySwitcher] Setting role cookie:", roleCookie);
      document.cookie = roleCookie;
      
      if (entityId) {
        const entityCookie = `${IMPERSONATION_ENTITY_COOKIE}=${entityId}; path=/; max-age=${60 * 60 * 24}`;
        console.log("[EntitySwitcher] Setting entity cookie:", entityCookie);
        document.cookie = entityCookie;
        setImpersonatingEntityId(entityId);
      }
      setImpersonatingRole(role);
    }
    
    // Verify cookies were set
    const allCookies = document.cookie;
    console.log("[EntitySwitcher] All cookies after setting:", allCookies);
    console.log("[EntitySwitcher] Role cookie check:", document.cookie.includes(`${IMPERSONATION_COOKIE}=${role}`));
    if (entityId) {
      console.log("[EntitySwitcher] Entity cookie check:", document.cookie.includes(`${IMPERSONATION_ENTITY_COOKIE}=${entityId}`));
    }
    
    setShowModal(false);
    
    // Small delay to ensure cookies are set before reload
    setTimeout(() => {
      console.log("[EntitySwitcher] Reloading page...");
      window.location.reload();
    }, 100);
  };

  const handleRoleClick = (role: UserRole) => {
    if (role === "attendee" || role === "venue_admin" || role === "event_organizer" || role === "promoter") {
      loadEntities(role);
    } else {
      setImpersonation(role);
    }
  };

  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!impersonatingRole) {
    return null; // Still loading
  }

  const currentEntity = entities.find((e) => e.id === impersonatingEntityId);

  return (
    <div className="relative">
      <Dropdown
        trigger={
          <Button variant="secondary" size="sm" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">
              {impersonatingRole === "all"
                ? "All Roles (Superadmin)"
                : currentEntity
                ? `Viewing as: ${currentEntity.name}`
                : `Viewing as: ${impersonatingRole.replace(/_/g, " ")}`}
            </span>
            <span className="sm:hidden">Switch</span>
          </Button>
        }
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

      {/* Entity Selection Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`Select ${impersonatingRole?.replace(/_/g, " ")} to View As`}
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner text="Loading entities..." size="md" />
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="text-center py-8 text-foreground-muted">
                No {impersonatingRole?.replace(/_/g, " ")}s found
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredEntities.map((entity) => (
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

