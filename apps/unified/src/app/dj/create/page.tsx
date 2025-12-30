"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input, Textarea } from "@crowdstack/ui";
import { Radio, Upload, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { normalizeInstagramUrl, normalizeWebsiteUrl, normalizeMixcloudUrl, normalizeSpotifyUrl, normalizeYoutubeUrl } from "@/lib/utils/url-normalization";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { GenreSelector } from "@/components/GenreSelector";

export default function CreateDJProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  
  // Social links
  const [instagram_url, setInstagram_url] = useState("");
  const [soundcloud_url, setSoundcloud_url] = useState("");
  const [mixcloud_url, setMixcloud_url] = useState("");
  const [spotify_url, setSpotify_url] = useState("");
  const [youtube_url, setYoutube_url] = useState("");
  const [website_url, setWebsite_url] = useState("");
  
  // Images (will be uploaded after profile creation)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  // Check if user already has a DJ profile
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const response = await fetch("/api/dj/profile/check");
        if (response.ok) {
          const data = await response.json();
          // Only redirect if user actually has a profile
          if (data.hasProfile) {
          router.push("/app/dj");
          }
        }
        // 401 = not authenticated (stay on page, will fail on submit)
        // hasProfile: false = authenticated but no profile (stay on page to create one)
      } catch (error) {
        // Network error - stay on page
        console.error("Error checking DJ profile:", error);
      }
    };
    checkExistingProfile();
  }, [router]);


  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (stepNum === 1) {
      if (!name.trim()) {
        newErrors.name = "Name is required";
      }
      if (handle && !/^[a-z0-9-]+$/.test(handle)) {
        newErrors.handle = "Handle must contain only lowercase letters, numbers, and hyphens";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Normalize URLs before sending
      const normalizedInstagram = normalizeInstagramUrl(instagram_url);
      const normalizedWebsite = normalizeWebsiteUrl(website_url);
      const normalizedMixcloud = normalizeMixcloudUrl(mixcloud_url);
      const normalizedSpotify = normalizeSpotifyUrl(spotify_url);
      const normalizedYoutube = normalizeYoutubeUrl(youtube_url);

      const response = await fetch("/api/dj/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim() || undefined,
          bio: bio.trim() || undefined,
          location: location.trim() || undefined,
          genres: genres.length > 0 ? genres : undefined,
          instagram_url: normalizedInstagram || undefined,
          soundcloud_url: soundcloud_url.trim() || undefined,
          mixcloud_url: normalizedMixcloud || undefined,
          spotify_url: normalizedSpotify || undefined,
          youtube_url: normalizedYoutube || undefined,
          website_url: normalizedWebsite || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create DJ profile");
      }

      // Upload images if provided (would need separate API endpoints)
      // For now, redirect to dashboard - images can be uploaded later from profile settings

      // Redirect to DJ dashboard
      router.push("/app/dj");
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to create DJ profile" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-primary/20 mb-4">
            <Radio className="h-8 w-8 text-accent-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Create DJ Profile</h1>
          <p className="text-secondary">Set up your DJ profile to showcase your mixes and events</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= stepNum
                    ? "bg-accent-primary text-white"
                    : "bg-glass border border-border-subtle text-secondary"
                }`}
              >
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    step > stepNum ? "bg-accent-primary" : "bg-border-subtle"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-primary mb-4">Basic Information</h2>
                <p className="text-sm text-secondary mb-6">
                  Let's start with the basics. Your handle will be used in your profile URL.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  DJ Name <span className="text-red-400">*</span>
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
                <label className="block text-sm font-medium text-primary mb-2">
                  Handle (Optional)
                </label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="dj-your-name"
                  className={errors.handle ? "border-red-400" : ""}
                />
                <p className="text-xs text-secondary mt-1">
                  Leave blank to auto-generate. Your profile will be at /dj/[handle]
                </p>
                {errors.handle && <p className="text-red-400 text-xs mt-1">{errors.handle}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
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

              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!name.trim()}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Social Links */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-primary mb-4">Social Links</h2>
                <p className="text-sm text-secondary mb-6">
                  Add your social media profiles (all optional)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">Instagram</label>
                <Input
                  value={instagram_url}
                  onChange={(e) => setInstagram_url(e.target.value)}
                  placeholder="@yourprofile or instagram.com/yourprofile"
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

              <div className="flex justify-between">
                <Button onClick={handleBack} variant="secondary">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleNext}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-primary mb-4">Review & Create</h2>
                <p className="text-sm text-secondary mb-6">
                  Review your information and create your profile. You can add photos later.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">Name</span>
                  <p className="text-primary">{name}</p>
                </div>
                {handle && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Handle</span>
                    <p className="text-primary">/dj/{handle}</p>
                  </div>
                )}
                {bio && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Bio</span>
                    <p className="text-primary">{bio}</p>
                  </div>
                )}
                {location && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Location</span>
                    <p className="text-primary">{location}</p>
                  </div>
                )}
                {genres.length > 0 && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Genres</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {genres.map((genre) => (
                        <span key={genre} className="px-2 py-1 bg-glass border border-border-subtle rounded text-sm">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(instagram_url || soundcloud_url || mixcloud_url || spotify_url || youtube_url || website_url) && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">Social Links</span>
                    <div className="space-y-1 mt-1">
                      {instagram_url && <p className="text-sm text-primary">Instagram: {instagram_url}</p>}
                      {soundcloud_url && <p className="text-sm text-primary">SoundCloud: {soundcloud_url}</p>}
                      {mixcloud_url && <p className="text-sm text-primary">Mixcloud: {mixcloud_url}</p>}
                      {spotify_url && <p className="text-sm text-primary">Spotify: {spotify_url}</p>}
                      {youtube_url && <p className="text-sm text-primary">YouTube: {youtube_url}</p>}
                      {website_url && <p className="text-sm text-primary">Website: {website_url}</p>}
                    </div>
                  </div>
                )}
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-lg">
                  <p className="text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button onClick={handleBack} variant="secondary" disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Profile <Radio className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

