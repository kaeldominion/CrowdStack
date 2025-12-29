"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Input, Textarea } from "@crowdstack/ui";
import { Radio, Loader2, X } from "lucide-react";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

interface CreateDJModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateDJModal({ isOpen, onClose, onSuccess }: CreateDJModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form fields
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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setHandle("");
      setBio("");
      setLocation("");
      setGenres([]);
      setGenreInput("");
      setInstagram_url("");
      setSoundcloud_url("");
      setMixcloud_url("");
      setSpotify_url("");
      setYoutube_url("");
      setWebsite_url("");
      setSelectedUser(null);
      setUserSearchQuery("");
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen]);

  // Search for users
  useEffect(() => {
    if (!userSearchQuery.trim() || userSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      setSearchingUsers(true);
      try {
        const response = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out users who already have a DJ profile
          const availableUsers = (data.users || []).filter((user: any) => !user.roles?.includes("dj"));
          setSearchResults(availableUsers.slice(0, 10)); // Limit to 10 results
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchingUsers(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/djs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: selectedUser?.id || undefined,
          name: name.trim(),
          handle: handle.trim() || undefined,
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          genres,
          instagram_url: normalizeInstagramUrl(instagram_url) || undefined,
          soundcloud_url: soundcloud_url.trim() || undefined,
          mixcloud_url: normalizeMixcloudUrl(mixcloud_url) || undefined,
          spotify_url: normalizeSpotifyUrl(spotify_url) || undefined,
          youtube_url: normalizeYoutubeUrl(youtube_url) || undefined,
          website_url: normalizeWebsiteUrl(website_url) || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create DJ profile" }));
        throw new Error(data.error || `Failed to create DJ profile (${response.status})`);
      }

      const data = await response.json();

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create DJ profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create DJ Profile" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Assign to User (optional)
          </label>
          <p className="text-xs text-secondary mb-2">
            Leave empty to create a DJ profile without a user account. You can assign a user later.
          </p>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search for user by email..."
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                setSelectedUser(null);
              }}
              disabled={loading}
            />
            {searchingUsers && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-secondary" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {userSearchQuery.length >= 2 && !selectedUser && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-void border border-border-strong rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setUserSearchQuery(user.email);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-active transition-colors"
                  >
                    <div className="font-medium text-primary">{user.email}</div>
                    {user.profile?.name && (
                      <div className="text-sm text-secondary">{user.profile.name}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="mt-2 p-3 bg-active rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-primary">{selectedUser.email}</div>
                    {selectedUser.profile?.name && (
                      <div className="text-sm text-secondary">{selectedUser.profile.name}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchQuery("");
                    }}
                    className="text-secondary hover:text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {!selectedUser && userSearchQuery.length >= 2 && !searchingUsers && searchResults.length === 0 && (
            <p className="mt-1 text-sm text-secondary">No users found. You can create the DJ profile without a user.</p>
          )}
          {!userSearchQuery && !selectedUser && (
            <p className="mt-1 text-sm text-secondary">Search for a user to assign, or leave empty to create without a user.</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Name <span className="text-accent-error">*</span>
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DJ Name"
            required
            disabled={loading}
          />
        </div>

        {/* Handle */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">
            Handle (optional - auto-generated if not provided)
          </label>
          <Input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="dj-handle"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-secondary">
            Lowercase letters, numbers, and hyphens only. Will be prefixed with "dj-" if not present.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about this DJ..."
            rows={4}
            disabled={loading}
          />
        </div>

        {/* Location */}
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          label="Location"
          placeholder="Start typing a city..."
          helperText="Search for a city"
          disabled={loading}
        />

        {/* Genres */}
        <div>
          <label className="block text-sm font-medium text-primary mb-2">Genres</label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGenre();
                }
              }}
              placeholder="Add genre..."
              disabled={loading}
            />
            <Button type="button" onClick={addGenre} disabled={loading}>
              Add
            </Button>
          </div>
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-active rounded text-sm"
                >
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="hover:text-accent-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Instagram</label>
            <Input
              value={instagram_url}
              onChange={(e) => setInstagram_url(e.target.value)}
              placeholder="@yourprofile or instagram.com/yourprofile"
              disabled={loading}
            />
            <p className="text-xs text-secondary mt-1">
              Enter your Instagram handle (with or without @) or full URL
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-2">SoundCloud</label>
            <Input
              value={soundcloud_url}
              onChange={(e) => setSoundcloud_url(e.target.value)}
              placeholder="soundcloud.com/yourprofile"
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
            <p className="text-xs text-secondary mt-1">
              Enter your Spotify artist/playlist URL or path
            </p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">YouTube</label>
            <Input
              value={youtube_url}
              onChange={(e) => setYoutube_url(e.target.value)}
              placeholder="@yourchannel or youtube.com/@yourchannel"
              disabled={loading}
            />
            <p className="text-xs text-secondary mt-1">
              Enter your YouTube channel handle (with @) or full URL
            </p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-primary mb-2">Website</label>
            <Input
              value={website_url}
              onChange={(e) => setWebsite_url(e.target.value)}
              placeholder="yourwebsite.com or https://yourwebsite.com"
              disabled={loading}
            />
            <p className="text-xs text-secondary mt-1">
              Enter your website domain or full URL
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-accent-error/10 border border-accent-error/20 rounded-lg text-accent-error text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Radio className="h-4 w-4 mr-2" />
                Create DJ Profile
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

