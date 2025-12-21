"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { Button, Input } from "@crowdstack/ui";
import { Save, Check, User, Mail, Phone } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface PromoterProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export default function PromoterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        .select("id, name, email, phone")
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

  const updateField = (field: keyof PromoterProfile, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      [field]: value || null,
    });
  };

  const saveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setErrors({});

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("promoters")
        .update({
          name: profile.name,
          email: profile.email || null,
          phone: profile.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      setErrors({ save: error.message || "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Profile</h1>
          <p className="mt-2 text-sm text-white/60">
            Manage your promoter profile information
          </p>
        </div>
        <BentoCard>
          <div className="text-center py-12">
            <User className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">Profile not found</p>
          </div>
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Profile</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage your promoter profile information
        </p>
      </div>

      <BentoCard>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="h-4 w-4" />
                Saved
              </div>
            )}
          </div>

          {errors.save && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.save}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
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
              <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
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
              <p className="text-xs text-white/40 mt-1">
                Your email address for notifications and communications
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
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
              <p className="text-xs text-white/40 mt-1">
                Your phone number for contact
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
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
