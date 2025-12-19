"use client";

import { useState } from "react";
import { Modal, Button } from "@crowdstack/ui";
import { Upload } from "lucide-react";

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCSVModal({ isOpen, onClose, onSuccess }: ImportCSVModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/attendees/import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to import CSV");
      }

      const data = await response.json();
      alert(`Successfully imported ${data.imported || 0} attendees`);
      
      setFile(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to import CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Attendees from CSV" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            CSV File
          </label>
          <div className="border-2 border-dashed border-border rounded-md p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-foreground-muted" />
              <span className="text-sm text-foreground-muted">
                {file ? file.name : "Click to upload CSV file"}
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            CSV should have columns: name, email, phone
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!file}>
            Import
          </Button>
        </div>
      </form>
    </Modal>
  );
}

