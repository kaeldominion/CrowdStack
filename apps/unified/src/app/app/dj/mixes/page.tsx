"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Textarea } from "@crowdstack/ui";
import { Plus, Edit, Trash2, Star, StarOff, Eye, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Mix } from "@crowdstack/shared/types";

export default function DJMixesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMix, setEditingMix] = useState<Mix | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [soundcloud_url, setSoundcloud_url] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  useEffect(() => {
    loadMixes();
  }, []);

  const loadMixes = async () => {
    try {
      const response = await fetch("/api/dj/mixes");
      if (!response.ok) throw new Error("Failed to load mixes");
      const data = await response.json();
      setMixes(data.mixes || []);
    } catch (error) {
      console.error("Failed to load mixes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMix = () => {
    setEditingMix(null);
    setTitle("");
    setDescription("");
    setSoundcloud_url("");
    setStatus("draft");
    setErrors({});
    setShowForm(true);
  };

  const handleEditMix = (mix: Mix) => {
    setEditingMix(mix);
    setTitle(mix.title);
    setDescription(mix.description || "");
    setSoundcloud_url(mix.soundcloud_url);
    setStatus(mix.status);
    setErrors({});
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMix(null);
    setTitle("");
    setDescription("");
    setSoundcloud_url("");
    setStatus("draft");
    setErrors({});
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});

    if (!title.trim()) {
      setErrors({ title: "Title is required" });
      setSaving(false);
      return;
    }

    if (!soundcloud_url.trim()) {
      setErrors({ soundcloud_url: "SoundCloud URL is required" });
      setSaving(false);
      return;
    }

    try {
      const url = editingMix ? `/api/dj/mixes/${editingMix.id}` : "/api/dj/mixes";
      const method = editingMix ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          soundcloud_url: soundcloud_url.trim(),
          status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save mix");
      }

      await loadMixes();
      handleCancel();
    } catch (error: any) {
      setErrors({ save: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mixId: string) => {
    if (!confirm("Are you sure you want to delete this mix?")) return;

    try {
      const response = await fetch(`/api/dj/mixes/${mixId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete mix");

      await loadMixes();
    } catch (error) {
      console.error("Failed to delete mix:", error);
      alert("Failed to delete mix");
    }
  };

  const handleToggleFeatured = async (mix: Mix) => {
    try {
      const response = await fetch(`/api/dj/mixes/${mix.id}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_featured: !mix.is_featured,
        }),
      });

      if (!response.ok) throw new Error("Failed to update mix");

      await loadMixes();
    } catch (error) {
      console.error("Failed to toggle featured:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Mixes</h1>
          <p className="mt-2 text-sm text-secondary">Manage your mixes and mixtapes</p>
        </div>
        <Button onClick={handleNewMix} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Mix
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">
            {editingMix ? "Edit Mix" : "New Mix"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mix Title"
                className={errors.title ? "border-red-400" : ""}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of the mix..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                SoundCloud URL <span className="text-red-400">*</span>
              </label>
              <Input
                value={soundcloud_url}
                onChange={(e) => setSoundcloud_url(e.target.value)}
                placeholder="https://soundcloud.com/..."
                className={errors.soundcloud_url ? "border-red-400" : ""}
              />
              {errors.soundcloud_url && (
                <p className="text-red-400 text-xs mt-1">{errors.soundcloud_url}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                className="w-full px-3 py-2 bg-glass border border-border-subtle rounded-lg text-primary"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            {errors.save && (
              <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
                <p className="text-red-400 text-sm">{errors.save}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {mixes.length === 0 && !showForm && (
        <Card className="p-8 text-center">
          <div className="text-muted mb-4">
            <Eye className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">No mixes yet</h3>
          <p className="text-secondary mb-4">Create your first mix to get started</p>
          <Button onClick={handleNewMix}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mix
          </Button>
        </Card>
      )}

      {mixes.length > 0 && (
        <div className="space-y-4">
          {mixes.map((mix) => (
            <Card key={mix.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-glass border border-border-subtle flex-shrink-0">
                  {mix.cover_image_url ? (
                    <Image
                      src={mix.cover_image_url}
                      alt={mix.title}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Eye className="h-8 w-8 text-muted" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-primary truncate">{mix.title}</h3>
                        {mix.is_featured && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            Featured
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          mix.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-muted"
                        }`}>
                          {mix.status}
                        </span>
                      </div>
                      {mix.description && (
                        <p className="text-sm text-secondary line-clamp-2 mb-2">{mix.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted">
                        <span>{mix.plays_count || 0} plays</span>
                        <a
                          href={mix.soundcloud_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View on SoundCloud →
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditMix(mix)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleFeatured(mix)}
                    >
                      {mix.is_featured ? (
                        <>
                          <StarOff className="h-4 w-4 mr-1" />
                          Unfeature
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-1" />
                          Feature
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDelete(mix.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



