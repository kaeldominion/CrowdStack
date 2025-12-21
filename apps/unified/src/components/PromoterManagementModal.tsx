"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  LoadingSpinner,
} from "@crowdstack/ui";
import { Search, UserPlus, Trash2, Users, DollarSign } from "lucide-react";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type?: "promoter" | "user";
  user_id?: string;
}

interface EventPromoter {
  id: string;
  commission_type: string;
  commission_config: any;
  promoter: Promoter | null;
  registrations: number;
}

interface PromoterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onUpdate?: () => void;
  context?: "venue" | "organizer";
}

export function PromoterManagementModal({
  isOpen,
  onClose,
  eventId,
  onUpdate,
  context = "organizer",
}: PromoterManagementModalProps) {
  const [eventPromoters, setEventPromoters] = useState<EventPromoter[]>([]);
  const [availablePromoters, setAvailablePromoters] = useState<Promoter[]>([]);
  const [searchResults, setSearchResults] = useState<Array<Promoter & { type?: "promoter" | "user"; user_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [addingPromoterId, setAddingPromoterId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [commissionType, setCommissionType] = useState("flat_per_head");
  const [commissionAmount, setCommissionAmount] = useState("5");

  useEffect(() => {
    if (isOpen) {
      loadEventPromoters();
      loadAvailablePromoters();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    // Debounced search
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPromotersAndUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, eventId]);

  const loadEventPromoters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/promoters`);
      if (!response.ok) throw new Error("Failed to load promoters");
      const data = await response.json();
      setEventPromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading event promoters:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePromoters = async () => {
    try {
      // Use context-specific endpoint to get promoters who have worked together
      const endpoint = context === "venue" 
        ? "/api/venue/promoters" 
        : "/api/organizer/promoters";
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to load available promoters");
      const data = await response.json();
      setAvailablePromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading available promoters:", error);
    }
  };

  const searchPromotersAndUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/events/${eventId}/promoters/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search");
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching promoters/users:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addPromoter = async (promoter: Promoter & { type?: "promoter" | "user"; user_id?: string }) => {
    try {
      const identifier = promoter.id.startsWith("user-") ? promoter.user_id : promoter.id;
      setAddingPromoterId(identifier || promoter.id);
      
      const body: any = {
        commission_type: commissionType,
        commission_config:
          commissionType === "flat_per_head"
            ? { amount_per_head: parseFloat(commissionAmount) || 5 }
            : { tiers: [] },
        assigned_by: context,
      };

      // If it's a user (not yet a promoter), send user_id; otherwise send promoter_id
      if (promoter.type === "user" && promoter.user_id) {
        body.user_id = promoter.user_id;
      } else {
        body.promoter_id = promoter.id;
      }

      const response = await fetch(`/api/events/${eventId}/promoters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add promoter");
      }

      await loadEventPromoters();
      await loadAvailablePromoters(); // Refresh available promoters list
      setSearchQuery(""); // Clear search
      setSearchResults([]);
      setShowAddSection(false);
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || "Failed to add promoter");
    } finally {
      setAddingPromoterId(null);
    }
  };

  const removePromoter = async (eventPromoterId: string) => {
    if (!confirm("Are you sure you want to remove this promoter from the event?")) {
      return;
    }

    try {
      setRemovingId(eventPromoterId);
      const response = await fetch(
        `/api/events/${eventId}/promoters?event_promoter_id=${eventPromoterId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove promoter");
      }

      await loadEventPromoters();
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || "Failed to remove promoter");
    } finally {
      setRemovingId(null);
    }
  };

  // Filter out promoters already assigned to this event
  const assignedPromoterIds = new Set(
    eventPromoters.map((ep) => ep.promoter?.id).filter(Boolean)
  );

  // If we have search results, use those; otherwise use available promoters (filtered)
  const displayPromoters = searchQuery.length >= 2 
    ? searchResults.filter((p) => !assignedPromoterIds.has(p.id))
    : availablePromoters.filter((p) => {
        if (assignedPromoterIds.has(p.id)) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
        );
      });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Event Promoters"
      size="xl"
    >
      <div className="space-y-6">
        {/* Current Promoters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Promoters ({eventPromoters.length})
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddSection(!showAddSection)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Promoter
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner text="Loading promoters..." size="md" />
            </div>
          ) : eventPromoters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventPromoters.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell className="font-medium">
                      {ep.promoter?.name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-foreground-muted">
                      {ep.promoter?.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {ep.commission_type === "flat_per_head"
                          ? `$${ep.commission_config?.amount_per_head || 0}/head`
                          : "Tiered"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{ep.registrations}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePromoter(ep.id)}
                        disabled={removingId === ep.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-foreground-muted border border-dashed border-border rounded-lg">
              No promoters assigned yet
            </div>
          )}
        </div>

        {/* Add Promoter Section */}
        {showAddSection && (
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Add a Promoter
            </h3>

            {/* Commission Settings */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-1">
                  Commission Type
                </label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="flat_per_head">Flat Per Head</option>
                  <option value="tiered_thresholds">Tiered Thresholds</option>
                </select>
              </div>
              {commissionType === "flat_per_head" && (
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-1">
                    Amount Per Head ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={commissionAmount}
                      onChange={(e) => setCommissionAmount(e.target.value)}
                      className="pl-9"
                      placeholder="5.00"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
              <Input
                placeholder="Search promoters by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery.length >= 2 && (
                <p className="mt-2 text-xs text-foreground-muted">
                  Searching existing promoters and users...
                </p>
              )}
            </div>

            {/* Available Promoters List */}
            <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
              {searching ? (
                <div className="text-center py-8 text-foreground-muted">
                  Searching...
                </div>
              ) : displayPromoters.length > 0 ? (
                <div className="divide-y divide-border">
                  {displayPromoters.slice(0, 20).map((promoter) => (
                    <div
                      key={promoter.id}
                      className="flex items-center justify-between p-3 hover:bg-background-secondary"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {promoter.name}
                          {promoter.type === "user" && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-foreground-muted">
                          {promoter.email || promoter.phone || "No contact info"}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => addPromoter(promoter)}
                        disabled={addingPromoterId === (promoter.user_id || promoter.id)}
                        loading={addingPromoterId === (promoter.user_id || promoter.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-foreground-muted">
                  {searchQuery.length >= 2
                    ? "No promoters or users found matching your search"
                    : searchQuery
                    ? "Type at least 2 characters to search"
                    : "No more promoters available to add"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

