"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Input,
} from "@crowdstack/ui";
import { Search, UserPlus, Mail, Info } from "lucide-react";

interface AddOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: () => void;
}

export function AddOrganizerModal({
  isOpen,
  onClose,
  onAdd,
}: AddOrganizerModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/venue/organizers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find organizer");
      }

      setSuccess(
        data.message || "Organizer found! They can now create events at your venue."
      );
      onAdd(); // Refresh the list
      
      // Clear form after a delay
      setTimeout(() => {
        setEmail("");
        setSuccess(null);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to find organizer");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Organizer"
      size="md"
    >
      <div className="space-y-4">
        <div className="text-sm text-secondary">
          Search for an organizer by their user email address. If they have an organizer account, 
          they'll be able to create events at your venue.
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary">
            Organizer Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
            <Input
              type="email"
              placeholder="organizer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleSearch();
                }
              }}
              className="pl-10"
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">
            {success}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSearch}
            loading={loading}
            disabled={!email.trim()}
          >
            <Search className="h-4 w-4 mr-2" />
            Search & Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}

