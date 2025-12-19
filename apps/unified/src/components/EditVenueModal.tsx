"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Textarea } from "@crowdstack/ui";

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
}

interface EditVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  venue: Venue | null;
}

export function EditVenueModal({ isOpen, onClose, onSuccess, venue }: EditVenueModalProps) {
  const [loading, setLoading] = useState(false);
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
    }
  }, [venue, isOpen]);

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

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Update Venue
          </Button>
        </div>
      </form>
    </Modal>
  );
}

