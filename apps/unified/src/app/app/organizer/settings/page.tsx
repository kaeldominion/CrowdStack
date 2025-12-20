"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent } from "@crowdstack/ui";
import { Save, Upload, X, Trash2, Plus, Check } from "lucide-react";
import Image from "next/image";
import type { Organizer, OrganizerTeamMember } from "@crowdstack/shared/types";
import { OrganizerLogo } from "@/components/organizer/OrganizerLogo";
import { TeamMemberCard } from "@/components/organizer/TeamMemberCard";

interface OrganizerSettingsData {
  organizer: Organizer;
  team_members: OrganizerTeamMember[];
}

export default function OrganizerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OrganizerSettingsData | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedTab, setSavedTab] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<OrganizerTeamMember | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/organizer/settings");
      if (!response.ok) throw new Error("Failed to load settings");
      const result = await response.json();
      setData({
        organizer: result.organizer,
        team_members: result.organizer.team_members || [],
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrganizerField = (field: string, value: any) => {
    if (!data) return;
    setData({
      ...data,
      organizer: {
        ...data.organizer,
        [field]: value,
      },
    });
  };

  const saveSettings = async (tab: string) => {
    if (!data) return;

    setSaving(true);
    setErrors({});

    try {
      const payload: any = { organizer: data.organizer };

      const response = await fetch("/api/organizer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      // Show success indicator
      setSavedTab(tab);
      setTimeout(() => {
        setSavedTab(null);
      }, 3000);
    } catch (error: any) {
      setErrors({ save: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!data) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/organizer/logo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload logo");

      const result = await response.json();
      updateOrganizerField("logo_url", result.logo_url);
    } catch (error) {
      console.error("Failed to upload logo:", error);
    }
  };

  const handleAddTeamMember = async (memberData: {
    name: string;
    role?: string;
    email?: string;
    avatar_url?: string;
    user_id?: string;
  }) => {
    try {
      const response = await fetch("/api/organizer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add team member");
      }

      await loadSettings();
      setShowMemberForm(false);
      setEditingMember(null);
    } catch (error: any) {
      console.error("Failed to add team member:", error);
      alert(error.message || "Failed to add team member");
    }
  };

  const handleUpdateTeamMember = async (id: string, memberData: {
    name?: string;
    role?: string;
    email?: string;
    avatar_url?: string;
  }) => {
    try {
      const response = await fetch("/api/organizer/team", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...memberData }),
      });

      if (!response.ok) throw new Error("Failed to update team member");

      await loadSettings();
      setEditingMember(null);
    } catch (error) {
      console.error("Failed to update team member:", error);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team member?")) return;

    try {
      const response = await fetch(`/api/organizer/team?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete team member");

      await loadSettings();
    } catch (error) {
      console.error("Failed to delete team member:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pt-4">
        <div className="text-center py-12">
          <p className="text-white/60">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8 pt-4">
        <div className="text-center py-12">
          <p className="text-white/60">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Organizer Settings</h1>
        <p className="mt-2 text-sm text-white/60">Manage your organizer profile and team</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground">Profile Information</h2>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Logo</label>
                <p className="text-xs text-foreground-muted mb-3">
                  Recommended: 512×512px (square), PNG with transparent background. Max 5MB.
                </p>
                {data.organizer.logo_url && (
                  <div className="relative w-32 h-32 border-2 border-border mb-2">
                    <Image src={data.organizer.logo_url} alt="Logo" fill className="object-contain" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                  className="text-sm"
                />
              </div>

              <Input
                label="Organizer Name"
                value={data.organizer.name || ""}
                onChange={(e) => updateOrganizerField("name", e.target.value)}
                required
              />

              <Input
                label="Company Name"
                value={data.organizer.company_name || ""}
                onChange={(e) => updateOrganizerField("company_name", e.target.value)}
              />

              <Textarea
                label="Bio"
                value={data.organizer.bio || ""}
                onChange={(e) => updateOrganizerField("bio", e.target.value)}
                rows={6}
                placeholder="Tell us about your organization..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Website"
                  type="url"
                  value={data.organizer.website || ""}
                  onChange={(e) => updateOrganizerField("website", e.target.value)}
                  placeholder="https://example.com"
                />
                <Input
                  label="Email"
                  type="email"
                  value={data.organizer.email || ""}
                  disabled
                  helperText="Contact email (read-only)"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Social Links</h3>
                <Input
                  label="Instagram"
                  type="text"
                  value={data.organizer.instagram_url || ""}
                  onChange={(e) => updateOrganizerField("instagram_url", e.target.value)}
                  placeholder="@username or https://instagram.com/username"
                />
                <Input
                  label="Twitter/X"
                  type="text"
                  value={data.organizer.twitter_url || ""}
                  onChange={(e) => updateOrganizerField("twitter_url", e.target.value)}
                  placeholder="@username or https://twitter.com/username"
                />
                <Input
                  label="Facebook"
                  type="url"
                  value={data.organizer.facebook_url || ""}
                  onChange={(e) => updateOrganizerField("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              {errors.save && <p className="text-error text-sm">{errors.save}</p>}

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("profile")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
                {savedTab === "profile" && (
                  <div className="flex items-center gap-2 text-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">Team Members</h2>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingMember(null);
                    setShowMemberForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>

              {/* Team Member Form */}
              {showMemberForm && (
                <TeamMemberForm
                  member={editingMember}
                  onSave={(memberData) => {
                    if (editingMember) {
                      handleUpdateTeamMember(editingMember.id, memberData);
                    } else {
                      handleAddTeamMember(memberData);
                    }
                  }}
                  onCancel={() => {
                    setShowMemberForm(false);
                    setEditingMember(null);
                  }}
                />
              )}

              {/* Team Members List */}
              {data.team_members.length === 0 ? (
                <div className="text-center py-8 text-foreground-muted">
                  <p>No team members yet. Add your first team member above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.team_members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border-2 border-border"
                    >
                      <TeamMemberCard member={member} size="md" />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingMember(member);
                            setShowMemberForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeamMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamMemberForm({
  member,
  onSave,
  onCancel,
}: {
  member: OrganizerTeamMember | null;
  onSave: (data: { name: string; role?: string; email?: string; user_id?: string; avatar_url?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(member?.name || "");
  const [role, setRole] = useState(member?.role || "");
  const [email, setEmail] = useState(member?.email || "");
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    alreadyAdded?: boolean;
    message?: string;
    user?: { id: string; email: string; name: string; avatar_url?: string | null };
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string; avatar_url?: string | null } | null>(null);

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    setSearchResult(null);
    setSelectedUser(null);

    try {
      const response = await fetch(`/api/organizer/team/search-users?email=${encodeURIComponent(searchEmail.trim())}`);
      const data = await response.json();

      if (data.found) {
        setSearchResult(data);
        if (!data.alreadyAdded && data.user) {
          setSelectedUser(data.user);
          setName(data.user.name);
          setEmail(data.user.email);
        }
      } else {
        setSearchResult(data);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
      setSearchResult({ found: false, message: "Failed to search users" });
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchEmail("");
    setSearchResult(null);
    setSelectedUser(null);
    setName(member?.name || "");
    setEmail(member?.email || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSave({
      name: name.trim(),
      role: role.trim() || undefined,
      email: email.trim() || undefined,
      user_id: selectedUser?.id,
      avatar_url: selectedUser?.avatar_url || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-2 border-border space-y-4">
      {!member && (
        <>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Search for Existing User (by email)
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSearch}
                disabled={searching || !searchEmail.trim()}
              >
                {searching ? "Searching..." : "Search"}
              </Button>
              {searchResult && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                >
                  Clear
                </Button>
              )}
            </div>
            {searchResult && (
              <div className={`mt-2 p-3 rounded-md text-sm ${
                searchResult.found && !searchResult.alreadyAdded
                  ? "bg-success/10 border border-success/20 text-success"
                  : searchResult.alreadyAdded
                  ? "bg-warning/10 border border-warning/20 text-warning"
                  : "bg-background-secondary border border-border text-foreground-muted"
              }`}>
                {searchResult.found && searchResult.user && !searchResult.alreadyAdded && (
                  <p>✓ Found user: {searchResult.user.name} ({searchResult.user.email})</p>
                )}
                {searchResult.alreadyAdded && (
                  <p>{searchResult.message}</p>
                )}
                {!searchResult.found && (
                  <p>{searchResult.message || "User not found. You can add them manually below (they'll need to sign up later)."}</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-xs text-foreground-muted mb-3">
              Or enter team member details manually:
            </p>
          </div>
        </>
      )}
      
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={!!selectedUser}
      />
      <Input
        label="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="e.g., Co-Founder, Event Manager"
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (selectedUser) {
            setSelectedUser(null);
          }
        }}
        placeholder={member ? "Optional" : "Enter email to search or add manually"}
        disabled={!!selectedUser}
      />
      
      {selectedUser && (
        <div className="text-xs text-foreground-muted">
          This team member will be linked to an existing user account and have access to the organizer dashboard.
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm">
          <Save className="h-4 w-4 mr-2" />
          {member ? "Update" : "Add"} Member
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
