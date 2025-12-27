"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@crowdstack/ui";

interface CreateOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrganizerModal({ isOpen, onClose, onSuccess }: CreateOrganizerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", // This will hold Company Name or Organizer Name
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/organizers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organizer");
      }

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to create organizer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Organizer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Company Name / Organizer Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Event Productions Inc. or DJ Marcus"
        />
        <p className="text-xs text-secondary">
          Enter the company name if they have one, otherwise enter the organizer name. The actual person's name will come from the user assigned to this organizer later.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@organizer.com"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Organizer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

