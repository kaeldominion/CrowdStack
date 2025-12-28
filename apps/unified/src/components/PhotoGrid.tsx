"use client";

import { useState } from "react";
import { Button } from "@crowdstack/ui";
import { Trash2, Star, StarOff, CheckSquare, Square } from "lucide-react";
import Image from "next/image";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  caption: string | null;
  is_featured?: boolean;
  featured_order?: number | null;
}

interface PhotoGridProps {
  photos: Photo[];
  eventId: string;
  canManage: boolean;
  onPhotosChange: () => void;
  onDelete?: (photoId: string) => void;
}

export function PhotoGrid({
  photos,
  eventId,
  canManage,
  onPhotosChange,
  onDelete,
}: PhotoGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleSelect = (photoId: string) => {
    if (!isSelectMode) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(photos.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAction = async (action: "delete" | "feature" | "unfeature") => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/events/${eventId}/photos/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          photoIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      setSelectedIds(new Set());
      setIsSelectMode(false);
      onPhotosChange();
    } catch (error: any) {
      alert(error.message || "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const featuredPhotos = photos.filter((p) => p.is_featured);
  const regularPhotos = photos.filter((p) => !p.is_featured);

  return (
    <div className="space-y-6">
      {/* Selection Toolbar */}
      {canManage && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-raised border border-border-subtle">
          {!isSelectMode ? (
            <>
              <p className="text-sm text-secondary">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSelectMode(true)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select Photos
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-primary">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={selectedIds.size === photos.length ? deselectAll : selectAll}
                  className="text-xs text-accent-secondary hover:text-accent-primary"
                >
                  {selectedIds.size === photos.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setIsSelectMode(false);
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkAction("feature")}
                      disabled={isProcessing}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Feature
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkAction("unfeature")}
                      disabled={isProcessing}
                    >
                      <StarOff className="h-4 w-4 mr-2" />
                      Unfeature
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${selectedIds.size} photo(s)?`)) {
                          handleBulkAction("delete");
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Featured Photos Section */}
      {featuredPhotos.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
            Featured Photos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredPhotos.map((photo) => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                isSelectMode={isSelectMode}
                canManage={canManage}
                onToggleSelect={() => toggleSelect(photo.id)}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular Photos Section */}
      {regularPhotos.length > 0 && (
        <div>
          {featuredPhotos.length > 0 && (
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-4">
              All Photos
            </h3>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {regularPhotos.map((photo) => (
              <PhotoItem
                key={photo.id}
                photo={photo}
                isSelected={selectedIds.has(photo.id)}
                isSelectMode={isSelectMode}
                canManage={canManage}
                onToggleSelect={() => toggleSelect(photo.id)}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoItem({
  photo,
  isSelected,
  isSelectMode,
  canManage,
  onToggleSelect,
  onDelete,
}: {
  photo: Photo;
  isSelected: boolean;
  isSelectMode: boolean;
  canManage: boolean;
  onToggleSelect: () => void;
  onDelete?: (photoId: string) => void;
}) {
  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-raised border border-border-subtle">
        <Image
          src={photo.thumbnail_url || photo.url}
          alt={photo.caption || "Photo"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
        />
      </div>

      {/* Selection Checkbox */}
      {isSelectMode && (
        <button
          onClick={onToggleSelect}
          className="absolute top-2 left-2 z-10 p-1.5 rounded bg-void/90 backdrop-blur-sm border border-border-strong"
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-accent-primary" />
          ) : (
            <Square className="h-5 w-5 text-secondary" />
          )}
        </button>
      )}

      {/* Featured Badge */}
      {photo.is_featured && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded bg-accent-warning/90 backdrop-blur-sm">
          <Star className="h-3 w-3 text-void fill-void" />
        </div>
      )}

      {/* Actions on Hover */}
      {canManage && !isSelectMode && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm("Delete this photo?")) {
                  onDelete(photo.id);
                }
              }}
              className="p-2 rounded-full bg-accent-error/80 hover:bg-accent-error text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

