"use client";

import { useState, useRef } from "react";
import { Avatar } from "./Avatar";
import { Button, InlineSpinner } from "@crowdstack/ui";
import { Camera, X, Upload } from "lucide-react";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  name?: string;
  email?: string | null;
  onUploadComplete?: (avatarUrl: string) => void;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({
  currentAvatarUrl,
  name,
  email,
  onUploadComplete,
  size = "lg",
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Image must be smaller than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      setPreview(null);
      if (onUploadComplete) {
        onUploadComplete(data.avatar_url);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your avatar?")) return;

    setUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete avatar");
      }

      if (onUploadComplete) {
        onUploadComplete("");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete avatar");
    } finally {
      setUploading(false);
    }
  };

  const displayAvatar = preview || currentAvatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar
          name={name}
          email={email}
          avatarUrl={displayAvatar || undefined}
          size={size}
          className="border-4 border-white/20"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <InlineSpinner size="lg" className="text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {currentAvatarUrl ? "Change" : "Upload"}
          </Button>

          {currentAvatarUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDelete}
              disabled={uploading}
              className="flex items-center gap-2 text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
              Remove
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>
        )}

        {preview && !uploading && (
          <p className="text-xs text-white/40 text-center">
            Click upload to save your new avatar
          </p>
        )}
      </div>
    </div>
  );
}

