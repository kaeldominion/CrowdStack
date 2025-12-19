"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Textarea } from "@crowdstack/ui";
import { Trash2, AlertTriangle } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  events_count?: number;
}

interface EditVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venue: Venue | null;
  onDelete?: () => void;
}

export function EditVenueModal({ isOpen, onClose, onSuccess, venue, onDelete }: EditVenueModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0: hidden, 1: warning, 2: confirm, 3: type name
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "US",
    phone: "",
    email: "",
    website: "",
  });

  // Load venue data when modal opens
  useEffect(() => {
    if (venue && isOpen) {
      setFormData({
        name: venue.name || "",
        address: venue.address || "",
        city: venue.city || "",
        state: venue.state || "",
        country: venue.country || "US",
        phone: venue.phone || "",
        email: venue.email || "",
        website: venue.website || "",
      });
      // Reset delete state when modal opens
      setDeleteStep(0);
      setDeleteConfirmText("");
    }
  }, [venue, isOpen]);

  const handleDelete = async () => {
    if (!venue) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/venues/${venue.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete venue");
      }

      onDelete?.();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to delete venue");
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = venue && (!venue.events_count || venue.events_count === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venue) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/venues/${venue.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update venue");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to update venue");
    } finally {
      setLoading(false);
    }
  };

  if (!venue) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Venue" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Venue Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="The Grand Ballroom"
        />

        <Textarea
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Main Street"
          rows={2}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="New York"
          />
          <Input
            label="State"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="NY"
          />
          <Input
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="US"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="venue@example.com"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <Input
          label="Website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://venue.com"
        />

        <div className="flex justify-between items-center pt-4 border-t border-border">
          {/* Delete Section */}
          {deleteStep === 0 && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setDeleteStep(1)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Venue
            </Button>
          )}

          {deleteStep >= 1 && (
            <div className="flex-1 mr-4">
              {deleteStep === 1 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Are you sure?</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        This action cannot be undone. This will permanently delete the venue.
                      </p>
                      {!canDelete && (
                        <p className="text-xs text-destructive mt-2 font-medium">
                          ⚠️ This venue has {venue?.events_count} event(s) and cannot be deleted.
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setDeleteStep(0)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => setDeleteStep(2)}
                          disabled={!canDelete}
                        >
                          Yes, continue
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Final confirmation required</p>
                      <p className="text-xs text-foreground-muted mt-1">
                        Type <strong>{venue?.name}</strong> to confirm deletion.
                      </p>
                      <Input
                        className="mt-2"
                        placeholder="Type venue name to confirm"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                      />
                      <div className="flex gap-2 mt-3">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setDeleteStep(0);
                            setDeleteConfirmText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="destructive" 
                          onClick={handleDelete}
                          disabled={deleteConfirmText !== venue?.name}
                          loading={deleting}
                        >
                          Permanently Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit buttons */}
          {deleteStep === 0 && (
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Update Venue
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

