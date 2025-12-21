"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@crowdstack/shared";
import { User, Mail, Phone, Save, Check, AlertCircle, Calendar, Instagram, MessageCircle, FileText, ArrowLeft } from "lucide-react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@crowdstack/ui";

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
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      // Try to get attendee profile
      const profileResponse = await fetch("/api/profile");
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

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Reload profile to get updated data
      await loadProfile();
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
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] px-4 pt-24 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/me" className="inline-flex items-center text-white/60 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Edit Profile
          </h1>
          <p className="mt-2 text-white/60">
            Manage your personal information
          </p>
        </div>

        {/* Profile Form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-white/10">
            <AvatarUpload
              currentAvatarUrl={formData.avatar_url}
              name={formData.name}
              email={user?.email}
              onUploadComplete={handleAvatarUpload}
              size="lg"
            />
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your first name"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Surname */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  placeholder="Enter your last name"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Email cannot be changed here. Contact support to update your email.
              </p>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                WhatsApp Number
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+1234567890"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Your WhatsApp number for event updates and communications
              </p>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Required for age verification
              </p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Gender
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: "male" })}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    formData.gender === "male"
                      ? "bg-primary/20 border-primary text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: "female" })}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    formData.gender === "female"
                      ? "bg-primary/20 border-primary text-white"
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Bio
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 h-5 w-5 text-white/40" />
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us a bit about yourself..."
                  rows={4}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Optional - A short bio about yourself
              </p>
            </div>

            {/* Instagram Handle */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Instagram Handle
              </label>
              <div className="relative">
                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value.replace("@", "") })}
                  placeholder="username (without @)"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Optional - Your Instagram username
              </p>
            </div>

            {/* TikTok Handle */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                TikTok Handle
              </label>
              <div className="relative">
                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  value={formData.tiktok_handle}
                  onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value.replace("@", "") })}
                  placeholder="username (without @)"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Optional - Your TikTok username
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {saved && (
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                <Check className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">Profile updated successfully!</p>
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
