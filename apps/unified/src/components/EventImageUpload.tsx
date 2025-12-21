"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@crowdstack/ui";
import { Upload, X, Loader2 } from "lucide-react";

interface EventImageUploadProps {
  label: string;
  currentImageUrl?: string | null;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => Promise<void>;
  accept?: string;
  helperText?: string;
  aspectRatio?: "9:16" | "16:9" | "4:3" | "free";
}

export function EventImageUpload({
  label,
  currentImageUrl,
  onUpload,
  onRemove,
  accept = "image/jpeg,image/png,image/webp",
  helperText,
  aspectRatio = "free",
}: EventImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      alert("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }

    // Validate aspect ratio if required
    if (aspectRatio !== "free") {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });

      const imageAspectRatio = img.width / img.height;
      let expectedRatio: number;
      let ratioName: string;

      switch (aspectRatio) {
        case "9:16":
          expectedRatio = 9 / 16; // 0.5625
          ratioName = "9:16 (portrait)";
          break;
        case "16:9":
          expectedRatio = 16 / 9; // 1.777...
          ratioName = "16:9 (landscape)";
          break;
        case "4:3":
          expectedRatio = 4 / 3; // 1.333...
          ratioName = "4:3";
          break;
        default:
          expectedRatio = imageAspectRatio; // No validation
          ratioName = "";
      }

      // Allow 5% tolerance
      const tolerance = 0.05;
      const diff = Math.abs(imageAspectRatio - expectedRatio);

      if (diff > tolerance) {
        URL.revokeObjectURL(url);
        alert(`Image must be in ${ratioName} format. Current ratio: ${img.width}:${img.height} (${imageAspectRatio.toFixed(2)}). Please crop or resize your image.`);
        return;
      }

      URL.revokeObjectURL(url);
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const url = await onUpload(file);
      setPreview(url);
    } catch (error: any) {
      alert(error.message || "Failed to upload image");
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    if (!confirm("Are you sure you want to remove this image?")) return;

    try {
      await onRemove();
      setPreview(null);
    } catch (error: any) {
      alert(error.message || "Failed to remove image");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {helperText && (
        <p className="text-xs text-foreground-muted">{helperText}</p>
      )}

      {preview ? (
        <div className="relative">
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface ${
              aspectRatio === "9:16"
                ? "aspect-[9/16]"
                : aspectRatio === "16:9"
                ? "aspect-video"
                : aspectRatio === "4:3"
                ? "aspect-[4/3]"
                : "aspect-video"
            }`}
          >
            <Image
              src={preview}
              alt={label}
              fill
              className={aspectRatio === "9:16" ? "object-contain" : "object-cover"}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Replace
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {label}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

