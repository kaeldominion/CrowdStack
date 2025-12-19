"use client";

import { useState, useEffect } from "react";
import { Card, Button, Badge, Modal, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@crowdstack/ui";
import { Star, Plus, Trash2, Search, Calendar, Building2 } from "lucide-react";
import Link from "next/link";

interface Partnership {
  id: string;
  auto_approve: boolean;
  created_at: string;
  events_count: number;
  organizer: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface Organizer {
  id: string;
  name: string;
  email: string | null;
}

export default function PreapprovedOrganizersPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingOrganizerId, setAddingOrganizerId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    try {
      const response = await fetch("/api/venue/organizers/preapproved");
      if (response.ok) {
        const data = await response.json();
        setPartnerships(data.partnerships || []);
      }
    } catch (error) {
      console.error("Failed to load partnerships:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizers = async () => {
    try {
      // Load all organizers (admin API)
      const response = await fetch("/api/admin/organizers");
      if (response.ok) {
        const data = await response.json();
        // Filter out already pre-approved organizers
        const existingOrgIds = new Set(partnerships.map((p) => p.organizer.id));
        const available = (data.organizers || []).filter(
          (org: Organizer) => !existingOrgIds.has(org.id)
        );
        setOrganizers(available);
      }
    } catch (error) {
      console.error("Failed to load organizers:", error);
    }
  };

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    await loadOrganizers();
  };

  const handleAddOrganizer = async (organizerId: string) => {
    setAddingOrganizerId(organizerId);
    try {
      const response = await fetch("/api/venue/organizers/preapproved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizer_id: organizerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add organizer");
      }

      await loadPartnerships();
      setShowAddModal(false);
      setSearchQuery("");
    } catch (error: any) {
      alert(error.message || "Failed to add organizer");
    } finally {
      setAddingOrganizerId(null);
    }
  };

  const handleRemovePartnership = async (partnershipId: string) => {
    if (!confirm("Remove this organizer from the pre-approved list? Their future events will need manual approval.")) {
      return;
    }

    setRemovingId(partnershipId);
    try {
      const response = await fetch(`/api/venue/organizers/preapproved?id=${partnershipId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove organizer");
      }

      setPartnerships((prev) => prev.filter((p) => p.id !== partnershipId));
    } catch (error: any) {
      alert(error.message || "Failed to remove organizer");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredOrganizers = organizers.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading pre-approved organizers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-foreground flex items-center gap-3">
            <Star className="h-8 w-8 text-warning" />
            Pre-approved Organizers
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Manage organizers whose events are automatically approved at your venue
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Organizer
        </Button>
      </div>

      {/* Info card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-3">
          <Star className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              <strong>How it works:</strong> Events from pre-approved organizers are 
              automatically approved when created. You'll still receive a notification 
              when they create new events so you can stay informed.
            </p>
          </div>
        </div>
      </Card>

      {partnerships.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-foreground-muted mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Pre-approved Organizers
            </h3>
            <p className="text-foreground-muted mb-4">
              Add organizers you trust to skip the approval step for their events.
            </p>
            <Button variant="primary" onClick={handleOpenAddModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Pre-approved Organizer
            </Button>
          </div>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organizer</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Events at Venue</TableHead>
              <TableHead>Added</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partnerships.map((partnership) => (
              <TableRow key={partnership.id} hover>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    <span className="font-medium">{partnership.organizer.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-foreground-muted">
                  {partnership.organizer.email || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    {partnership.events_count} events
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground-muted">
                  {formatDate(partnership.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePartnership(partnership.id)}
                    loading={removingId === partnership.id}
                    className="text-error hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Organizer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSearchQuery("");
        }}
        title="Add Pre-approved Organizer"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            placeholder="Search organizers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredOrganizers.length === 0 ? (
              <div className="p-8 text-center text-foreground-muted">
                {organizers.length === 0
                  ? "Loading organizers..."
                  : "No organizers found matching your search"}
              </div>
            ) : (
              filteredOrganizers.map((organizer) => (
                <div
                  key={organizer.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{organizer.name}</p>
                    {organizer.email && (
                      <p className="text-sm text-foreground-muted">{organizer.email}</p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddOrganizer(organizer.id)}
                    loading={addingOrganizerId === organizer.id}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false);
                setSearchQuery("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

