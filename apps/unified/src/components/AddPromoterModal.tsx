"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Input,
  Badge,
} from "@crowdstack/ui";
import { Search, UserPlus, QrCode, Info, Mail, Phone } from "lucide-react";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface AddPromoterModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: "venue" | "organizer";
  eventId?: string; // Optional: if adding to a specific event
}

export function AddPromoterModal({
  isOpen,
  onClose,
  context,
  eventId,
}: AddPromoterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [availablePromoters, setAvailablePromoters] = useState<Promoter[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingPromoterId, setAddingPromoterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      searchPromoters();
    } else {
      setAvailablePromoters([]);
    }
  }, [searchQuery, isOpen]);

  const searchPromoters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Search for promoters - this will be filtered by RLS to only show
      // promoters who have worked with this venue/organizer
      const endpoint = context === "venue" 
        ? "/api/venue/promoters" 
        : "/api/organizer/promoters";
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to search promoters");
      
      const data = await response.json();
      const allPromoters = data.promoters || [];
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const filtered = allPromoters.filter((p: Promoter) =>
          p.name.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
        );
        setAvailablePromoters(filtered);
      } else {
        setAvailablePromoters(allPromoters);
      }
    } catch (err: any) {
      console.error("Error searching promoters:", err);
      setError(err.message || "Failed to search promoters");
    } finally {
      setLoading(false);
    }
  };

  const addPromoter = async (promoterId: string) => {
    try {
      setAddingPromoterId(promoterId);
      setError(null);

      if (eventId) {
        // Add to specific event
        const response = await fetch(`/api/events/${eventId}/promoters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            promoter_id: promoterId,
            commission_type: "flat_per_head",
            commission_config: { amount_per_head: 5 },
            assigned_by: context, // Track who assigned
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add promoter");
        }
      } else {
        // For now, we need an event to add a promoter
        // In the future, we could add a "general assignment" feature
        throw new Error("Please select an event first");
      }

      // Success - close modal and refresh
      onClose();
    } catch (err: any) {
      console.error("Error adding promoter:", err);
      setError(err.message || "Failed to add promoter");
    } finally {
      setAddingPromoterId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Promoter"
      size="lg"
    >
      <div className="space-y-4">
        <div className="text-sm text-foreground-muted">
          {context === "venue" 
            ? "Search for promoters who have worked at your venue. You can only see promoters who have already worked on events at your venue."
            : "Search for promoters who have worked on your events. You can only see promoters who have already worked on your events."}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Results */}
        {searchQuery.length >= 2 && (
          <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-foreground-muted">
                Searching...
              </div>
            ) : availablePromoters.length > 0 ? (
              <div className="divide-y divide-border">
                {availablePromoters.map((promoter) => (
                  <div
                    key={promoter.id}
                    className="flex items-center justify-between p-4 hover:bg-background-secondary"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {promoter.name}
                      </div>
                      <div className="text-sm text-foreground-muted mt-1 flex items-center gap-4">
                        {promoter.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {promoter.email}
                          </div>
                        )}
                        {promoter.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {promoter.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    {eventId ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => addPromoter(promoter.id)}
                        disabled={addingPromoterId === promoter.id}
                        loading={addingPromoterId === promoter.id}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add to Event
                      </Button>
                    ) : (
                      <Badge variant="secondary">Already worked together</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-foreground-muted">
                {searchQuery.length >= 2
                  ? "No promoters found matching your search"
                  : "Start typing to search for promoters"}
              </div>
            )}
          </div>
        )}

        {!eventId && (
          <div className="p-3 bg-background-secondary border border-border rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-foreground-muted mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground-muted">
              <p className="font-medium text-foreground mb-1">Note</p>
              <p>
                To add a promoter to a specific event, go to that event's page and use the "Manage Promoters" button.
                This view shows all promoters who have worked with you.
              </p>
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

