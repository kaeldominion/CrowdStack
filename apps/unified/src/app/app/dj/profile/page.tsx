"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Textarea } from "@crowdstack/ui";
import { Save, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import type { DJ } from "@crowdstack/shared/types";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { GenreSelector } from "@/components/GenreSelector";

export default function DJProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dj, setDJ] = useState<DJ | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [instagram_url, setInstagram_url] = useState("");
  const [soundcloud_url, setSoundcloud_url] = useState("");
  const [mixcloud_url, setMixcloud_url] = useState("");
  const [spotify_url, setSpotify_url] = useState("");
  const [youtube_url, setYoutube_url] = useState("");
  const [website_url, setWebsite_url] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/dj/profile");
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
      const response = await fetch("/api/dj/profile", {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Edit Profile</h1>
          <p className="mt-2 text-sm text-white/60">Update your DJ profile information</p>
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
              <p className="text-xs text-secondary mt-1">Your profile will be at /dj/{handle || "your-handle"}</p>
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

            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              label="Location"
              placeholder="Start typing your city..."
              helperText="Search for your city"
            />

            <GenreSelector
              value={genres}
              onChange={setGenres}
              label="Genres"
              placeholder="Select your genres..."
              helperText="Choose the genres you play"
              maxSelections={5}
            />
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
          <p className="text-sm text-white/60 mb-4">Image upload functionality coming soon</p>
          
          {dj?.profile_image_url && (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-border-subtle">
              <Image
                src={dj.profile_image_url}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

