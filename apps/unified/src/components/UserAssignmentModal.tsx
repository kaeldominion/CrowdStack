"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "@crowdstack/ui";
import { Search, User, Building2, Calendar, Check, X } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface User {
  id: string;
  email: string;
  roles: string[];
}

interface Entity {
  id: string;
  name: string;
  email?: string | null;
}

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  type: "venue" | "organizer";
  onAssign: () => void;
}

export function UserAssignmentModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  type,
  onAssign,
}: UserAssignmentModalProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [assignedEntities, setAssignedEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEntities();
      loadAssignedEntities();
    }
  }, [isOpen, userId, type]);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      const tableName = type === "venue" ? "venues" : "organizers";
      const { data, error } = await supabase
        .from(tableName)
        .select("id, name, email")
        .order("name");

      if (error) throw error;
      setEntities(data || []);
    } catch (error) {
      console.error("Failed to load entities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedEntities = async () => {
    try {
      const supabase = createBrowserClient();
      const junctionTable = type === "venue" ? "venue_users" : "organizer_users";
      const entityIdField = type === "venue" ? "venue_id" : "organizer_id";

      const { data, error } = await supabase
        .from(junctionTable)
        .select(entityIdField)
        .eq("user_id", userId);

      if (error) throw error;
      setAssignedEntities((data || []).map((d: any) => d[entityIdField]));
    } catch (error) {
      console.error("Failed to load assigned entities:", error);
    }
  };

  const toggleAssignment = async (entityId: string) => {
    const isAssigned = assignedEntities.includes(entityId);

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          entityType: type,
          action: isAssigned ? "unassign" : "assign",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update assignment");
      }

      // Update local state
      if (isAssigned) {
        setAssignedEntities((prev) => prev.filter((id) => id !== entityId));
      } else {
        setAssignedEntities((prev) => [...prev, entityId]);
      }
    } catch (error: any) {
      console.error("Failed to toggle assignment:", error);
      alert(error.message || "Failed to update assignment");
    } finally {
      setSaving(false);
      onAssign(); // Refresh parent
    }
  };

  const filteredEntities = entities.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign ${userEmail} to ${type === "venue" ? "Venues" : "Organizers"}`}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <Input
            type="text"
            placeholder={`Search ${type === "venue" ? "venues" : "organizers"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-foreground-muted">Loading...</div>
        ) : filteredEntities.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted">
            No {type === "venue" ? "venues" : "organizers"} found
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 border border-border rounded-md p-2">
            {filteredEntities.map((entity) => {
              const isAssigned = assignedEntities.includes(entity.id);
              return (
                <button
                  key={entity.id}
                  onClick={() => toggleAssignment(entity.id)}
                  disabled={saving}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    isAssigned
                      ? "bg-primary/10 border-primary"
                      : "border-border hover:bg-background"
                  } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {type === "venue" ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <Calendar className="h-4 w-4" />
                        )}
                        {entity.name}
                      </div>
                      {entity.email && (
                        <div className="text-sm text-foreground-muted mt-1">{entity.email}</div>
                      )}
                    </div>
                    <div className="ml-4">
                      {isAssigned ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-foreground-muted rounded" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

