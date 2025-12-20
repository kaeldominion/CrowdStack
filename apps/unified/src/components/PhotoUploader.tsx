"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@crowdstack/ui";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface PhotoUploaderProps {
  eventId: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function PhotoUploader({
  eventId,
  onUploadComplete,
  maxFiles = 50,
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);
      const validFiles = fileArray.filter((file) => {
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
          return false;
        }
        if (file.size > maxSize) {
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        return;
      }

      // Add files to state
      const newFiles: UploadProgress[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Upload files
      for (let i = 0; i < newFiles.length; i++) {
        const fileIndex = files.length + i;
        await uploadFile(validFiles[i], fileIndex);
      }
    },
    [eventId, files.length]
  );

  const uploadFile = async (file: File, index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "uploading", progress: 10 };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch(`/api/events/${eventId}/photos`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Check for errors in response
      if (data.errors && data.errors.length > 0) {
        // If there are specific errors, show them
        const errorMsg = data.errors.join("; ");
        throw new Error(errorMsg);
      }

      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: "success", progress: 100 };
        return updated;
      });

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error: any) {
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: "error",
          progress: 0,
          error: error.message,
        };
        return updated;
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const pendingCount = files.filter((f) => f.status === "pending" || f.status === "uploading").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileInput}
          className="hidden"
        />

        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-foreground-muted" />
        <p className="text-lg font-medium text-foreground mb-2">
          Drop photos here or click to browse
        </p>
        <p className="text-sm text-foreground-muted mb-4">
          JPEG, PNG, or WebP up to 10MB each
        </p>
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={pendingCount > 0}
        >
          <Upload className="h-4 w-4 mr-2" />
          Select Photos
        </Button>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground-muted">
              {successCount} uploaded
              {pendingCount > 0 && `, ${pendingCount} uploading`}
              {errorCount > 0 && `, ${errorCount} failed`}
            </span>
            {errorCount > 0 && (
              <div className="text-xs text-red-500 max-w-md">
                {files.find(f => f.status === "error")?.error || "Upload failed"}
              </div>
            )}
            {files.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiles([])}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {files.map((fileProgress, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-surface border border-border"
              >
                {fileProgress.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {fileProgress.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/80 z-10 p-2">
                    <X className="h-6 w-6 text-white mb-1" />
                    {fileProgress.error && (
                      <p className="text-xs text-white text-center line-clamp-2">
                        {fileProgress.error}
                      </p>
                    )}
                  </div>
                )}
                <img
                  src={URL.createObjectURL(fileProgress.file)}
                  alt={fileProgress.file.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
                {fileProgress.status === "uploading" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${fileProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

