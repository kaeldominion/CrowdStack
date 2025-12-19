"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Section, Card, Input, Textarea, Button } from "@crowdstack/ui";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Save, ArrowLeft } from "lucide-react";
import type { Attendee } from "@crowdstack/shared";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Partial<Attendee>>({
    name: "",
    surname: "",
    date_of_birth: "",
    bio: "",
    instagram_handle: "",
    tiktok_handle: "",
    whatsapp: "",
    avatar_url: null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setEmail(data.email || "");
      
      if (data.attendee) {
        setProfile({
          name: data.attendee.name || "",
          surname: data.attendee.surname || "",
          date_of_birth: data.attendee.date_of_birth || "",
          bio: data.attendee.bio || "",
          instagram_handle: data.attendee.instagram_handle || "",
          tiktok_handle: data.attendee.tiktok_handle || "",
          whatsapp: data.attendee.whatsapp || "",
          avatar_url: data.attendee.avatar_url || null,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSuccess(true);
      setProfile({ ...profile, ...data.attendee });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (avatarUrl: string) => {
    setProfile({ ...profile, avatar_url: avatarUrl });
    // Optionally auto-save on avatar upload
    // handleSubmit(new Event('submit'));
  };

  if (loading) {
    return (
      <Section spacing="xl">
        <Container size="sm">
          <div className="text-center py-16">
            <div className="text-foreground-muted">Loading profile...</div>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section spacing="xl">
      <Container size="sm">
        <div className="mb-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            My Profile
          </h1>
          <p className="mt-2 text-foreground-muted">
            Manage your profile information and preferences
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-md bg-error/10 border border-error/20 p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-success/10 border border-success/20 p-4">
                <p className="text-sm text-success">Profile updated successfully!</p>
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex justify-center">
              <AvatarUpload
                currentAvatarUrl={profile.avatar_url || null}
                name={profile.name || undefined}
                email={email}
                onUploadComplete={handleAvatarUpload}
                size="lg"
              />
            </div>

            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={profile.name || ""}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="John"
                      required
                    />

                    <Input
                      label="Last Name"
                      value={profile.surname || ""}
                      onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>

                  <Input
                    label="Email"
                    value={email}
                    disabled
                    className="bg-background-muted"
                    helperText="Email cannot be changed"
                  />

                  <Input
                    type="date"
                    label="Date of Birth"
                    value={profile.date_of_birth || ""}
                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                    helperText="We'll use this to verify age requirements for events"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">About You</h2>
                <Textarea
                  label="Bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  maxLength={500}
                  helperText={`${(profile.bio || "").length}/500 characters`}
                />
              </div>

              {/* Social & Contact */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Contact & Social</h2>
                <div className="space-y-4">
                  <Input
                    label="WhatsApp"
                    type="tel"
                    value={profile.whatsapp || ""}
                    onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                    placeholder="+1234567890"
                    helperText="We'll use WhatsApp for event updates (preparing for WhatsApp-first platform)"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Instagram"
                      value={profile.instagram_handle || ""}
                      onChange={(e) => {
                        const handle = e.target.value.replace("@", "");
                        setProfile({ ...profile, instagram_handle: handle });
                      }}
                      placeholder="username"
                      helperText="We'll tag you in event photos"
                    />

                    <Input
                      label="TikTok"
                      value={profile.tiktok_handle || ""}
                      onChange={(e) => {
                        const handle = e.target.value.replace("@", "");
                        setProfile({ ...profile, tiktok_handle: handle });
                      }}
                      placeholder="username"
                      helperText="Your TikTok username"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={saving}
                loading={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </Container>
    </Section>
  );
}
