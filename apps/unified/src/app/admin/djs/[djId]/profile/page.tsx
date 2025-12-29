"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input, Textarea, Container, Section } from "@crowdstack/ui";
import { Save, Loader2, ArrowLeft, Upload, X } from "lucide-react";
import Image from "next/image";
import type { DJ } from "@crowdstack/shared/types";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";

export default function AdminDJProfileEditPage() {
  const router = useRouter();
  const params = useParams();
  const djId = params.djId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dj, setDJ] = useState<DJ | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState("");
  const [instagram_url, setInstagram_url] = useState("");
  const [soundcloud_url, setSoundcloud_url] = useState("");
  const [mixcloud_url, setMixcloud_url] = useState("");
  const [spotify_url, setSpotify_url] = useState("");
  const [youtube_url, setYoutube_url] = useState("");
  const [website_url, setWebsite_url] = useState("");

  useEffect(() => {
    if (djId) {
      loadProfile();
    }
  }, [djId]);

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/admin/djs/${djId}/profile`);
      if (!response.ok) throw new Error("Failed to load profile");
      const data = await response.json();
      setDJ(data.dj);
      
      // Populate form
      setName(data.dj.name || "");
      setHandle(data.dj.handle || "");
      setBio(data.dj.bio || "");
      setLocation(data.dj.location || "");
      setGenres(data.dj.genres || []);
      setInstagram_url(data.dj.instagram_url || "");
      setSoundcloud_url(data.dj.soundcloud_url || "");
      setMixcloud_url(data.dj.mixcloud_url || "");
      setSpotify_url(data.dj.spotify_url || "");
      setYoutube_url(data.dj.youtube_url || "");
      setWebsite_url(data.dj.website_url || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const addGenre = () => {
    const trimmed = genreInput.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setGenreInput("");
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setGenres(genres.filter((g) => g !== genreToRemove));
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setErrors({});

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/djs/${djId}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload avatar");
      }

      const result = await response.json();
      setDJ((prev) => prev ? { ...prev, profile_image_url: result.avatar_url } : null);
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (error: any) {
      setErrors({ avatar: error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    setErrors({});

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/djs/${djId}/cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload cover image");
      }

      const result = await response.json();
      setDJ((prev) => prev ? { ...prev, cover_image_url: result.cover_url } : null);
      
      // Reload profile to get updated data
      await loadProfile();
    } catch (error: any) {
      setErrors({ cover: error.message });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    setSaved(false);

    // Normalize URLs before sending
    const normalizedInstagram = normalizeInstagramUrl(instagram_url);
    const normalizedWebsite = normalizeWebsiteUrl(website_url);
    const normalizedMixcloud = normalizeMixcloudUrl(mixcloud_url);
    const normalizedSpotify = normalizeSpotifyUrl(spotify_url);
    const normalizedYoutube = normalizeYoutubeUrl(youtube_url);

    try {
      const response = await fetch(`/api/admin/djs/${djId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handle,
          bio,
          location,
          genres,
          instagram_url: normalizedInstagram,
          soundcloud_url,
          mixcloud_url: normalizedMixcloud,
          spotify_url: normalizedSpotify,
          youtube_url: normalizedYoutube,
          website_url: normalizedWebsite,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      setErrors({ save: error.message });
    } finally {
      setSaving(false);
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
    <Container>
      <Section>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/admin/djs/${djId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tighter text-white">Edit DJ Profile</h1>
                <p className="mt-2 text-sm text-white/60">Update DJ profile information</p>
              </div>
            </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            "Saved!"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {errors.save && (
        <Card className="p-4 bg-red-400/10 border-red-400/20">
          <p className="text-red-400 text-sm">{errors.save}</p>
        </Card>
      )}

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="DJ Name"
                className={errors.name ? "border-red-400" : ""}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Handle</label>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="dj-your-name"
                className={errors.handle ? "border-red-400" : ""}
              />
              <p className="text-xs text-secondary mt-1">Profile will be at /dj/{handle || "your-handle"}</p>
              {errors.handle && <p className="text-red-400 text-xs mt-1">{errors.handle}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Bio</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Genres</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  placeholder="Add a genre (e.g., House, Techno)"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addGenre();
                    }
                  }}
                />
                <Button onClick={addGenre} variant="secondary">
                  Add
                </Button>
              </div>
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-glass border border-border-subtle rounded-full text-sm"
                    >
                      {genre}
                      <button
                        onClick={() => removeGenre(genre)}
                        className="text-secondary hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Social Links</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Instagram URL</label>
              <Input
                value={instagram_url}
                onChange={(e) => setInstagram_url(e.target.value)}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">SoundCloud</label>
              <Input
                value={soundcloud_url}
                onChange={(e) => setSoundcloud_url(e.target.value)}
                placeholder="soundcloud.com/yourprofile or https://soundcloud.com/yourprofile"
              />
              <p className="text-xs text-secondary mt-1">
                Enter your SoundCloud profile URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Mixcloud</label>
              <Input
                value={mixcloud_url}
                onChange={(e) => setMixcloud_url(e.target.value)}
                placeholder="yourprofile or mixcloud.com/yourprofile"
              />
              <p className="text-xs text-secondary mt-1">
                Enter your Mixcloud handle or full URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Spotify</label>
              <Input
                value={spotify_url}
                onChange={(e) => setSpotify_url(e.target.value)}
                placeholder="open.spotify.com/artist/... or /artist/..."
              />
              <p className="text-xs text-secondary mt-1">
                Enter your Spotify artist/playlist URL or path
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">YouTube</label>
              <Input
                value={youtube_url}
                onChange={(e) => setYoutube_url(e.target.value)}
                placeholder="@yourchannel or youtube.com/@yourchannel"
              />
              <p className="text-xs text-secondary mt-1">
                Enter your YouTube channel handle (with @) or full URL
              </p>
            </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">Website</label>
                <Input
                  value={website_url}
                  onChange={(e) => setWebsite_url(e.target.value)}
                  placeholder="yourwebsite.com or https://yourwebsite.com"
                />
                <p className="text-xs text-secondary mt-1">
                  Enter your website domain or full URL
                </p>
              </div>
          </div>
        </div>

        <div className="border-t border-border-subtle pt-6">
          <h2 className="text-lg font-semibold text-white mb-4">Images</h2>
          
          <div className="space-y-6">
            {/* Profile Avatar */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Profile Avatar
              </label>
              <p className="text-xs text-secondary mb-3">
                Recommended: 512×512px (square), PNG or JPG. Max 5MB.
              </p>
              <div className="flex items-start gap-4">
                {dj?.profile_image_url && (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border-subtle flex-shrink-0">
                    <Image
                      src={dj.profile_image_url}
                      alt="Profile Avatar"
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="avatar-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-glass border border-border-subtle rounded-lg cursor-pointer hover:bg-white/10 transition-colors ${uploadingAvatar ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {dj?.profile_image_url ? "Change Avatar" : "Upload Avatar"}
                      </>
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                  {errors.avatar && (
                    <p className="text-red-400 text-xs mt-2">{errors.avatar}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Cover Image
              </label>
              <p className="text-xs text-secondary mb-3">
                Recommended: 1920×1080px (16:9), PNG or JPG. Max 10MB.
              </p>
              <div className="flex items-start gap-4">
                {dj?.cover_image_url && (
                  <div className="relative w-64 h-36 rounded-lg overflow-hidden border-2 border-border-subtle flex-shrink-0">
                    <Image
                      src={dj.cover_image_url}
                      alt="Cover Image"
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <label
                    htmlFor="cover-upload"
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-glass border border-border-subtle rounded-lg cursor-pointer hover:bg-white/10 transition-colors ${uploadingCover ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {dj?.cover_image_url ? "Change Cover" : "Upload Cover"}
                      </>
                    )}
                  </label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverUpload(file);
                    }}
                  />
                  {errors.cover && (
                    <p className="text-red-400 text-xs mt-2">{errors.cover}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
        </div>
      </Section>
    </Container>
  );
}

