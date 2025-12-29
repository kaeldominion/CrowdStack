"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, Container, Section, Button, LoadingSpinner } from "@crowdstack/ui";
import { ArrowLeft, ImagePlus, Trash2, Loader2, Star } from "lucide-react";
import Image from "next/image";

export default function AdminDJMediaPage() {
  const params = useParams();
  const djId = params.djId as string;
  const [gallery, setGallery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadGallery();
  }, [djId]);

  const getImageUrl = (storagePath: string): string => {
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return storagePath;
    }
    
    // If it's already a full public URL, return as-is
    if (storagePath.includes("/storage/v1/object/public/")) {
      return storagePath;
    }
    
    // Construct public URL from storage path
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    
    if (projectRef) {
      return `https://${projectRef}.supabase.co/storage/v1/object/public/dj-images/${storagePath}`;
    }
    
    return storagePath;
  };

  const loadGallery = async () => {
    try {
      const response = await fetch(`/api/dj/gallery?djId=${djId}`);
      if (!response.ok) throw new Error("Failed to load gallery");
      const data = await response.json();
      // Map gallery items to include public URLs
      const galleryWithUrls = (data.gallery || []).map((img: any) => ({
        ...img,
        public_url: getImageUrl(img.storage_path),
      }));
      setGallery(galleryWithUrls);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", "");
    formData.append("is_hero", "false");

    try {
      const response = await fetch(`/api/dj/gallery?djId=${djId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      await loadGallery();
    } catch (error: any) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const response = await fetch(`/api/dj/gallery/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete image");
      }

      await loadGallery();
    } catch (error: any) {
      alert(error.message || "Failed to delete image");
    }
  };

  if (loading) {
    return (
      <Container>
        <Section>
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/admin/djs/${djId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">
              Manage Media
            </h1>
            <p className="text-white/60">
              Gallery images and videos management
            </p>
          </div>
        </div>

        {/* Gallery Section */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Gallery Images</h2>
              <label
                htmlFor="gallery-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </>
                )}
              </label>
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">{uploadError}</p>
              </div>
            )}

            {gallery.length === 0 ? (
              <div className="text-center py-12">
                <ImagePlus className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No gallery images yet</p>
                <p className="text-sm text-white/40 mt-2">
                  Upload images to build the gallery
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((image: any) => (
                  <div key={image.id} className="relative group">
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border-subtle">
                      <Image
                        src={image.public_url || getImageUrl(image.storage_path)}
                        alt={image.caption || "Gallery image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      {image.is_hero && (
                        <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded text-xs font-semibold text-white flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Hero
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(image.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    {image.caption && (
                      <p className="text-xs text-white/60 mt-2 line-clamp-2">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Videos Section - Placeholder */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Videos</h2>
            <div className="text-center py-12">
              <p className="text-white/60">Video management coming soon</p>
            </div>
          </div>
        </Card>
      </Section>
    </Container>
  );
}
