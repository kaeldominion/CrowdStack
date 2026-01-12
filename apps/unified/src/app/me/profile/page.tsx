"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared";
import {
  User,
  Mail,
  Phone,
  Save,
  Check,
  AlertCircle,
  Calendar,
  Instagram,
  MessageCircle,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button, Card, Input, Textarea, LoadingSpinner, Badge } from "@crowdstack/ui";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    whatsapp: "",
    date_of_birth: "",
    gender: "male" as "male" | "female",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    avatar_url: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createBrowserClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      // Try to get attendee profile with cache busting
      const timestamp = Date.now();
      const profileResponse = await fetch(`/api/profile?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const attendee = profileData.attendee;

        if (attendee) {
          setFormData({
            name: attendee.name || "",
            surname: attendee.surname || "",
            email: attendee.email || authUser.email || "",
            phone: attendee.phone || "",
            whatsapp: attendee.whatsapp || attendee.phone || "",
            date_of_birth: attendee.date_of_birth || "",
            gender: (attendee.gender as "male" | "female") || "male",
            bio: attendee.bio || "",
            instagram_handle: attendee.instagram_handle || "",
            tiktok_handle: attendee.tiktok_handle || "",
            avatar_url: attendee.avatar_url || "",
          });
        } else {
          setFormData({
            name: authUser.user_metadata?.name || "",
            surname: "",
            email: authUser.email || "",
            phone: "",
            whatsapp: "",
            date_of_birth: "",
            gender: "male",
            bio: "",
            instagram_handle: "",
            tiktok_handle: "",
            avatar_url: "",
          });
        }
      } else {
        setFormData({
          name: authUser.user_metadata?.name || "",
          surname: "",
          email: authUser.email || "",
          phone: "",
          whatsapp: "",
          date_of_birth: "",
          gender: "male",
          bio: "",
          instagram_handle: "",
          tiktok_handle: "",
          avatar_url: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          surname: formData.surname,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender,
          whatsapp: formData.whatsapp,
          bio: formData.bio || null,
          instagram_handle: formData.instagram_handle || null,
          tiktok_handle: formData.tiktok_handle || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      // Redirect back to /me after successful save
      router.push("/me");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (avatarUrl: string) => {
    setFormData({ ...formData, avatar_url: avatarUrl });
    // Reload profile to get updated avatar
    loadProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <LoadingSpinner text="Loading profile..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/me"
            className="inline-flex items-center text-secondary hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="page-title">Edit Profile</h1>
          <p className="mt-2 text-secondary">
            Manage your personal information
          </p>
        </div>

        {/* Profile Form Card */}
        <Card>
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-border-subtle">
            <AvatarUpload
              currentAvatarUrl={formData.avatar_url}
              name={formData.name}
              email={user?.email}
              onUploadComplete={handleAvatarUpload}
              size="lg"
            />
            <p className="mt-3 text-xs text-muted text-center">
              Click to upload a new photo
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                Personal Information
              </h3>

              {/* Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter your first name"
                  required
                />
                <Input
                  label="Last Name"
                  type="text"
                  value={formData.surname}
                  onChange={(e) =>
                    setFormData({ ...formData, surname: e.target.value })
                  }
                  placeholder="Enter your last name"
                  required
                />
              </div>

              {/* Email (Disabled) */}
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                disabled
                helperText="Email cannot be changed here. Contact support to update your email."
              />

              {/* Date of Birth & Gender Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                  max={
                    new Date(
                      new Date().setFullYear(new Date().getFullYear() - 13)
                    )
                      .toISOString()
                      .split("T")[0]
                  }
                  helperText="Used for age verification at events"
                />

                {/* Gender Toggle */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-primary mb-2">
                    Gender
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, gender: "male" })
                      }
                      className={`flex-1 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                        formData.gender === "male"
                          ? "bg-accent-primary/20 border-accent-primary text-primary"
                          : "bg-raised border-border-subtle text-secondary hover:border-accent-primary/30"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, gender: "female" })
                      }
                      className={`flex-1 py-3 px-4 rounded-xl border font-medium text-sm transition-all ${
                        formData.gender === "female"
                          ? "bg-accent-primary/20 border-accent-primary text-primary"
                          : "bg-raised border-border-subtle text-secondary hover:border-accent-primary/30"
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                Contact
              </h3>

              <Input
                label="WhatsApp Number"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, whatsapp: e.target.value })
                }
                placeholder="+1234567890"
                helperText="For event updates and notifications"
              />
            </div>

            {/* About Section */}
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                About You
              </h3>

              <Textarea
                label="Bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Tell us a bit about yourself..."
                rows={4}
                helperText="A short bio about yourself"
              />
            </div>

            {/* Social Media Section */}
            <div className="space-y-4 pt-4 border-t border-border-subtle">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
                Social Media
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Input
                    label="Instagram"
                    type="text"
                    value={formData.instagram_handle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        instagram_handle: e.target.value.replace("@", ""),
                      })
                    }
                    placeholder="username"
                    className="pl-8"
                  />
                  <Instagram className="absolute left-3 top-[38px] h-4 w-4 text-muted" />
                </div>

                <div className="relative">
                  <Input
                    label="TikTok"
                    type="text"
                    value={formData.tiktok_handle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tiktok_handle: e.target.value.replace("@", ""),
                      })
                    }
                    placeholder="username"
                    className="pl-8"
                  />
                  <MessageCircle className="absolute left-3 top-[38px] h-4 w-4 text-muted" />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-accent-error/10 border border-accent-error/30 rounded-xl">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-accent-error" />
                <p className="text-sm text-accent-error">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {saved && (
              <div className="flex items-center gap-3 p-4 bg-accent-success/10 border border-accent-success/30 rounded-xl">
                <Check className="h-5 w-5 flex-shrink-0 text-accent-success" />
                <p className="text-sm text-accent-success">
                  Profile updated successfully!
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/me")}
                className="sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                className="sm:flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
