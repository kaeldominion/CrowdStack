"use client";

import { useState, useEffect, useRef } from "react";
import { BentoCard } from "@/components/BentoCard";
import { Button, Input, Textarea, InlineSpinner } from "@crowdstack/ui";
import { Save, Check, User, Mail, Phone, Link2, Instagram, Copy, ExternalLink, Globe, Camera, X, MessageCircle } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";
import Link from "next/link";
import Image from "next/image";

interface PromoterProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  is_public: boolean;
}

export default function PromoterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugCopied, setSlugCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add cache busting by using a timestamp query parameter
      // This ensures we always get fresh data
      // Check both user_id (new way) and created_by (legacy) for compatibility
      let { data: promoter, error } = await supabase
        .from("promoters")
        .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
        .eq("user_id", user.id)
        .single();

      // Fallback to created_by if user_id doesn't match
      if (error && error.code === 'PGRST116') {
        const { data: promoterByCreator, error: creatorError } = await supabase
          .from("promoters")
          .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, whatsapp_number, is_public")
          .eq("created_by", user.id)
          .single();
        
        if (creatorError && creatorError.code !== 'PGRST116') {
          throw creatorError;
        }
        
        promoter = promoterByCreator;
      } else if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (promoter) {
        setProfile(promoter);
      } else {
        // No profile found - try to create one via API
        try {
          const ensureResponse = await fetch("/api/promoter/profile/ensure", {
            method: "POST",
            cache: 'no-store',
          });
          
          if (ensureResponse.ok) {
            const ensureData = await ensureResponse.json();
            if (ensureData.promoter) {
              setProfile(ensureData.promoter);
            }
          }
        } catch (ensureError) {
          console.error("Error ensuring promoter profile:", ensureError);
          // Don't throw - we'll show "Profile not found" message
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PromoterProfile, value: string | boolean) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value === "" ? null : value,
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrors({ avatar: "Please select a JPEG, PNG, or WebP image" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ avatar: "Image must be smaller than 5MB" });
      return;
    }

    setUploadingAvatar(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/promoter/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      // Reload profile to get fresh data from database
      await loadProfile();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setErrors({ avatar: err.message || "Failed to upload avatar" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Are you sure you want to delete your profile photo?")) return;

    setUploadingAvatar(true);
    setErrors({});

    try {
      const response = await fetch("/api/promoter/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete avatar");
      }

      // Reload profile to get fresh data from database
      await loadProfile();
    } catch (err: any) {
      setErrors({ avatar: err.message || "Failed to delete avatar" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setErrors({});

    // Validate slug format
    if (profile.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(profile.slug)) {
        setErrors({ slug: "Slug can only contain lowercase letters, numbers, and hyphens" });
        setSaving(false);
        return;
      }
      if (profile.slug.length < 3) {
        setErrors({ slug: "Slug must be at least 3 characters" });
        setSaving(false);
        return;
      }
    }

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("promoters")
        .update({
          name: profile.name,
          email: profile.email || null,
          phone: profile.phone || null,
          slug: profile.slug || null,
          bio: profile.bio || null,
          instagram_handle: profile.instagram_handle || null,
          whatsapp_number: profile.whatsapp_number || null,
          is_public: profile.is_public,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          setErrors({ slug: "This URL is already taken. Please choose a different one." });
          setSaving(false);
          return;
        }
        throw error;
      }

      // Reload profile to get fresh data from database
      await loadProfile();
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      setErrors({ save: error.message || "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  const copyProfileUrl = () => {
    if (!profile?.slug) return;
    const url = `${window.location.origin}/promoter/${profile.slug}`;
    navigator.clipboard.writeText(url);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-secondary">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Profile</h1>
          <p className="mt-2 text-sm text-secondary">
            Manage your promoter profile information
          </p>
        </div>
        <BentoCard>
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-secondary">Profile not found</p>
          </div>
        </BentoCard>
      </div>
    );
  }

  const profileUrl = profile.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/promoter/${profile.slug}` : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Profile</h1>
        <p className="mt-2 text-sm text-secondary">
          Manage your promoter profile information
        </p>
      </div>

      {/* Public Profile Link */}
      {profileUrl && profile.is_public && (
        <BentoCard className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 border-accent-primary/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-primary/20">
                <Globe className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Your Public Profile</p>
                <p className="text-xs text-secondary">Share this link with your guests</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <code className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-void/50 text-sm text-accent-primary font-mono truncate">
                {profileUrl}
              </code>
              <Button variant="secondary" size="sm" onClick={copyProfileUrl}>
                {slugCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Link href={`/promoter/${profile.slug}`} target="_blank">
                <Button variant="secondary" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </BentoCard>
      )}

      <BentoCard>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Profile Information</h2>
            {saved && (
              <div className="flex items-center gap-2 text-accent-success text-sm">
                <Check className="h-4 w-4" />
                Saved
              </div>
            )}
          </div>

          {errors.save && (
            <div className="p-3 rounded-md bg-accent-error/10 border border-accent-error/20 text-accent-error text-sm">
              {errors.save}
            </div>
          )}

          <div className="space-y-4">
            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">
                Profile Photo
              </label>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {profile.profile_image_url ? (
                    <Image
                      src={profile.profile_image_url}
                      alt={profile.name}
                      width={96}
                      height={96}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-3xl font-black text-white border-4 border-white/20">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <InlineSpinner size="lg" className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {profile.profile_image_url ? "Change" : "Upload"}
                    </Button>
                    {profile.profile_image_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {errors.avatar && (
                    <p className="text-xs text-accent-error">{errors.avatar}</p>
                  )}
                  <p className="text-xs text-muted">
                    JPEG, PNG, or WebP. Max 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile URL (Slug) */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Profile URL
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted whitespace-nowrap">crowdstack.app/promoter/</span>
                <Input
                  value={profile.slug || ""}
                  onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-name"
                  className="flex-1"
                />
              </div>
              {errors.slug && (
                <p className="text-xs text-accent-error mt-1">{errors.slug}</p>
              )}
              <p className="text-xs text-muted mt-1">
                This is your unique profile link. Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Name
              </label>
              <Input
                value={profile.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Your name"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Bio
              </label>
              <Textarea
                value={profile.bio || ""}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell people about yourself..."
                className="w-full min-h-[100px]"
              />
              <p className="text-xs text-muted mt-1">
                Displayed on your public profile page
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">@</span>
                  <Input
                    value={profile.instagram_handle || ""}
                    onChange={(e) => updateField("instagram_handle", e.target.value.replace(/^@/, ''))}
                    placeholder="yourhandle"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </label>
                <Input
                  value={profile.whatsapp_number || ""}
                  onChange={(e) => updateField("whatsapp_number", e.target.value)}
                  placeholder="+62 812 3456 7890"
                  className="w-full"
                />
                <p className="text-xs text-muted mt-1">
                  Include country code for clickable link
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                type="email"
                value={profile.email || ""}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="your@email.com"
                className="w-full"
              />
              <p className="text-xs text-muted mt-1">
                Your email address for notifications and communications
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <Input
                type="tel"
                value={profile.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full"
              />
              <p className="text-xs text-muted mt-1">
                Your phone number for contact
              </p>
            </div>

            {/* Public Profile Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-raised border border-border-subtle">
              <div>
                <p className="text-sm font-medium text-primary">Public Profile</p>
                <p className="text-xs text-muted">Allow anyone to view your profile page</p>
              </div>
              <button
                onClick={() => updateField("is_public", !profile.is_public)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  profile.is_public ? "bg-accent-primary" : "bg-border-strong"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile.is_public ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </BentoCard>
    </div>
  );
}
