"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input } from "@crowdstack/ui";
import { Trash2, AlertTriangle } from "lucide-react";

interface EditOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizer: any | null;
  onDelete?: () => void;
}

export function EditOrganizerModal({ isOpen, onClose, onSuccess, organizer, onDelete }: EditOrganizerModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0: hidden, 1: warning, 2: confirm with text
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
  });

  useEffect(() => {
    if (organizer && isOpen) {
      setFormData({
        name: organizer.name || "",
        email: organizer.email || "",
        phone: organizer.phone || "",
        company_name: organizer.company_name || "",
      });
      // Reset delete state when modal opens
      setDeleteStep(0);
      setDeleteConfirmText("");
    }
  }, [organizer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizer) return;
    
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/organizers/${organizer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update organizer");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to update organizer");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!organizer) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/organizers/${organizer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete organizer");
      }

      onDelete?.();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to delete organizer");
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = organizer && (!organizer.events_count || organizer.events_count === 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Organizer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organizer Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="DJ Marcus"
        />

        <Input
          label="Company Name"
          value={formData.company_name}
          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          placeholder="Event Productions Inc."
        />

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
              Delete Organizer
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
                        This action cannot be undone. This will permanently delete the organizer.
                      </p>
                      {!canDelete && (
                        <p className="text-xs text-destructive mt-2 font-medium">
                          ⚠️ This organizer has {organizer?.events_count} event(s) and cannot be deleted.
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
                        Type <strong>{organizer?.name}</strong> to confirm deletion.
                      </p>
                      <Input
                        className="mt-2"
                        placeholder="Type organizer name to confirm"
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
                          disabled={deleteConfirmText !== organizer?.name}
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
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
