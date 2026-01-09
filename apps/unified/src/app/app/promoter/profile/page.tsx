"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { Button, Input, Textarea } from "@crowdstack/ui";
import { Save, Check, User, Mail, Phone, Link2, Instagram, Copy, ExternalLink, Globe } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";
import Link from "next/link";

interface PromoterProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  bio: string | null;
  profile_image_url: string | null;
  instagram_handle: string | null;
  is_public: boolean;
}

export default function PromoterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugCopied, setSlugCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promoter } = await supabase
        .from("promoters")
        .select("id, name, email, phone, slug, bio, profile_image_url, instagram_handle, is_public")
        .eq("created_by", user.id)
        .single();

      if (promoter) {
        setProfile(promoter);
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
