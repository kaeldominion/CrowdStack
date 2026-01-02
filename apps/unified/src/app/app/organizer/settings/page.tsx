"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Select, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Save, Upload, X, Trash2, Plus, Check, Settings, FileText, Edit2, Star } from "lucide-react";
import Image from "next/image";
import type { Organizer, OrganizerTeamMember, OrganizerPermissions, PromoterPayoutTemplate, BonusTier } from "@crowdstack/shared/types";
import { OrganizerLogo } from "@/components/organizer/OrganizerLogo";
import { TeamMemberCard } from "@/components/organizer/TeamMemberCard";
import { PermanentDoorStaffSection } from "@/components/PermanentDoorStaffSection";
import { PermissionsEditor } from "@/components/PermissionsEditor";

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
  const [editingPermissions, setEditingPermissions] = useState<OrganizerTeamMember | null>(null);
  const [permissions, setPermissions] = useState<OrganizerPermissions | null>(null);
  
  // Payout Templates state
  const [templates, setTemplates] = useState<PromoterPayoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromoterPayoutTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTemplates();
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

  const handleDeleteTeamMember = async (id: string, userId?: string) => {
    if (!confirm("Are you sure you want to remove this team member? They will lose access to the organizer dashboard.")) return;

    try {
      const url = userId 
        ? `/api/organizer/team?id=${id}&user_id=${userId}`
        : `/api/organizer/team?id=${id}`;
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete team member");

      await loadSettings();
    } catch (error: any) {
      console.error("Failed to delete team member:", error);
      alert(error.message || "Failed to delete team member");
    }
  };

  const handleEditPermissions = (member: OrganizerTeamMember) => {
    if (member.is_owner) return; // Owners have all permissions
    setEditingPermissions(member);
    setPermissions(member.permissions || {
      manage_users: false,
      edit_profile: false,
      add_events: false,
      edit_events: false,
      delete_events: false,
      view_reports: false,
      manage_promoters: false,
      publish_photos: false,
      manage_payouts: false,
      full_admin: false,
      closeout_event: false,
      view_settings: false,
      manage_door_staff: false,
      view_financials: false,
    });
  };

  const handleSavePermissions = async () => {
    if (!editingPermissions || !permissions) return;

    try {
      const response = await fetch("/api/organizer/team/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editingPermissions.user_id,
          permissions: permissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update permissions");
      }

      await loadSettings();
      setEditingPermissions(null);
      setPermissions(null);
    } catch (error: any) {
      console.error("Failed to update permissions:", error);
      alert(error.message || "Failed to update permissions");
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/organizer/payout-templates");
      if (!response.ok) throw new Error("Failed to load templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSetDefaultTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/organizer/payout-templates/${templateId}/set-default`, {
        method: "PUT",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set default template");
      }

      await loadTemplates();
    } catch (error: any) {
      console.error("Failed to set default template:", error);
      alert(error.message || "Failed to set default template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/payout-templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete template");
      }

      await loadTemplates();
    } catch (error: any) {
      console.error("Failed to delete template:", error);
      alert(error.message || "Failed to delete template");
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
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Organizer Settings</h1>
        <p className="mt-2 text-sm text-secondary">Manage your organizer profile and team</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="door-staff">Door Staff</TabsTrigger>
          <TabsTrigger value="payout-templates">Payout Templates</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Profile Information</h2>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Logo</label>
                <p className="text-xs text-secondary mb-3">
                  Recommended: 512×512px (square), PNG with transparent background. Max 5MB.
                </p>
                {data.organizer.logo_url && (
                  <div className="relative w-32 h-32 border-2 border-border mb-2">
                    <Image src={data.organizer.logo_url} alt="Logo" fill sizes="128px" className="object-contain" />
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
                helperText="This is the name that will appear on your events and profile"
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
                <h3 className="text-sm font-medium text-primary">Social Links</h3>
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

              {errors.save && <p className="text-accent-error text-sm">{errors.save}</p>}

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
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
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
                <h2 className="text-2xl font-semibold text-primary">Team Members</h2>
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
                <div className="text-center py-8 text-secondary">
                  <p>No team members yet. Add your first team member above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.team_members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border-2 border-border rounded-lg"
                    >
                      <TeamMemberCard member={member} size="md" showDetails={true} />
                      <div className="flex items-center gap-2">
                        {!member.is_owner && member.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPermissions(member)}
                            title="Edit permissions"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        {!member.is_owner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeamMember(member.id, member.user_id)}
                            title={member.user_id ? "Remove user access" : "Delete team member"}
                          >
                            <Trash2 className="h-4 w-4 text-accent-error" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Door Staff Tab */}
        <TabsContent value="door-staff">
          <PermanentDoorStaffSection 
            type="organizer" 
            entityName={data?.organizer?.name}
          />
        </TabsContent>

        {/* Payout Templates Tab */}
        <TabsContent value="payout-templates">
          <Card>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-primary">Payout Templates</h2>
                  <p className="text-sm text-secondary mt-1">
                    Create reusable payout configurations to speed up promoter assignments
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowTemplateForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner text="Loading templates..." size="md" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-secondary mb-4" />
                  <p className="text-secondary mb-2">No templates yet</p>
                  <p className="text-sm text-secondary mb-4">
                    Create your first template to quickly apply payout settings when adding promoters
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border-2 border-border rounded-lg hover:border-accent-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-primary">{template.name}</h3>
                            {template.is_default && (
                              <Badge variant="success" size="sm">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-secondary mb-3">{template.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            {template.per_head_rate && (
                              <Badge variant="outline">
                                {template.per_head_rate.toLocaleString()} {template.currency || "IDR"}/head
                              </Badge>
                            )}
                            {template.fixed_fee && (
                              <Badge variant="outline">
                                Fixed: {template.fixed_fee.toLocaleString()} {template.currency || "IDR"}
                              </Badge>
                            )}
                            {template.bonus_tiers && template.bonus_tiers.length > 0 && (
                              <Badge variant="outline">
                                {template.bonus_tiers.length} bonus tier{template.bonus_tiers.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {template.bonus_threshold && template.bonus_amount && (
                              <Badge variant="outline">
                                Bonus: {template.bonus_amount.toLocaleString()} @ {template.bonus_threshold} guests
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!template.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultTemplate(template.id)}
                              title="Set as default"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template);
                              setShowTemplateForm(true);
                            }}
                            title="Edit template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4 text-accent-error" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permissions Editor Modal */}
      {editingPermissions && permissions && (
        <Modal
          isOpen={!!editingPermissions}
          onClose={() => {
            setEditingPermissions(null);
            setPermissions(null);
          }}
          title={`Edit Permissions - ${editingPermissions.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Configure what this team member can access and manage for your organizer account.
            </p>
            <PermissionsEditor
              permissions={permissions}
              onChange={(p) => setPermissions(p as OrganizerPermissions)}
              type="organizer"
            />
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingPermissions(null);
                  setPermissions(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSavePermissions}
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <TemplateFormModal
          template={editingTemplate}
          onSave={async () => {
            await loadTemplates();
            setShowTemplateForm(false);
            setEditingTemplate(null);
          }}
          onCancel={() => {
            setShowTemplateForm(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Template Form Component
function TemplateFormModal({
  template,
  onSave,
  onCancel,
}: {
  template: PromoterPayoutTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [currency, setCurrency] = useState(template?.currency || "");
  const [perHeadRate, setPerHeadRate] = useState(template?.per_head_rate?.toString() || "");
  const [perHeadMin, setPerHeadMin] = useState(template?.per_head_min?.toString() || "");
  const [perHeadMax, setPerHeadMax] = useState(template?.per_head_max?.toString() || "");
  const [fixedFee, setFixedFee] = useState(template?.fixed_fee?.toString() || "");
  const [minimumGuests, setMinimumGuests] = useState(template?.minimum_guests?.toString() || "");
  const [belowMinimumPercent, setBelowMinimumPercent] = useState(template?.below_minimum_percent?.toString() || "50");
  const [bonusThreshold, setBonusThreshold] = useState(template?.bonus_threshold?.toString() || "");
  const [bonusAmount, setBonusAmount] = useState(template?.bonus_amount?.toString() || "");
  const [useTieredBonuses, setUseTieredBonuses] = useState(template?.bonus_tiers && template.bonus_tiers.length > 0);
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>(template?.bonus_tiers || []);
  const [isDefault, setIsDefault] = useState(template?.is_default || false);

  const CURRENCIES = [
    { value: "IDR", label: "IDR - Indonesian Rupiah" },
    { value: "USD", label: "USD - US Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
  ];

  const addBonusTier = () => {
    setBonusTiers([...bonusTiers, { threshold: 20, amount: 0, repeatable: false, label: "" }]);
  };

  const updateBonusTier = (index: number, updates: Partial<BonusTier>) => {
    const newTiers = [...bonusTiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    setBonusTiers(newTiers);
  };

  const removeBonusTier = (index: number) => {
    setBonusTiers(bonusTiers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Template name is required");
      return;
    }

    setSaving(true);
    try {
      const url = template
        ? `/api/organizer/payout-templates/${template.id}`
        : "/api/organizer/payout-templates";
      const method = template ? "PUT" : "POST";

      const body: any = {
        name: name.trim(),
        description: description.trim() || null,
        currency: currency || null,
        per_head_rate: perHeadRate ? parseFloat(perHeadRate) : null,
        per_head_min: perHeadMin ? parseInt(perHeadMin) : null,
        per_head_max: perHeadMax ? parseInt(perHeadMax) : null,
        fixed_fee: fixedFee ? parseFloat(fixedFee) : null,
        minimum_guests: minimumGuests ? parseInt(minimumGuests) : null,
        below_minimum_percent: belowMinimumPercent ? parseFloat(belowMinimumPercent) : null,
        bonus_threshold: bonusThreshold ? parseInt(bonusThreshold) : null,
        bonus_amount: bonusAmount ? parseFloat(bonusAmount) : null,
        bonus_tiers: useTieredBonuses && bonusTiers.length > 0 ? bonusTiers.filter(t => t.threshold > 0 && t.amount > 0) : null,
        is_default: isDefault,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      onSave();
    } catch (error: any) {
      console.error("Failed to save template:", error);
      alert(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={template ? "Edit Template" : "Create Template"}
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Per-Head, VIP Promoter Deal"
          required
        />

        <Textarea
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When to use this template..."
          rows={2}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-border"
          />
          <label className="text-sm text-primary">Set as default template</label>
        </div>

        <Select
          label="Currency Override"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={[
            { value: "", label: "Use event default" },
            ...CURRENCIES,
          ]}
        />

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-primary mb-3">Per-Head Payment</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Amount Per Head"
              type="number"
              value={perHeadRate}
              onChange={(e) => setPerHeadRate(e.target.value)}
              placeholder="50000"
            />
            <Input
              label="Min Guests"
              type="number"
              value={perHeadMin}
              onChange={(e) => setPerHeadMin(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Max Guests"
              type="number"
              value={perHeadMax}
              onChange={(e) => setPerHeadMax(e.target.value)}
              placeholder="∞"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-primary mb-3">Fixed Fee</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Fixed Amount"
              type="number"
              value={fixedFee}
              onChange={(e) => setFixedFee(e.target.value)}
              placeholder="3000000"
            />
            <Input
              label="Minimum Guests"
              type="number"
              value={minimumGuests}
              onChange={(e) => setMinimumGuests(e.target.value)}
              placeholder="15"
            />
            <Input
              label="% If Below Minimum"
              type="number"
              min="0"
              max="100"
              value={belowMinimumPercent}
              onChange={(e) => setBelowMinimumPercent(e.target.value)}
              placeholder="50"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-primary">Bonuses</h4>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={useTieredBonuses}
                onChange={(e) => setUseTieredBonuses(e.target.checked)}
                className="rounded border-border"
              />
              Use tiered bonuses
            </label>
          </div>

          {!useTieredBonuses ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bonus Threshold"
                type="number"
                value={bonusThreshold}
                onChange={(e) => setBonusThreshold(e.target.value)}
                placeholder="20"
              />
              <Input
                label="Bonus Amount"
                type="number"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {bonusTiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-base rounded-lg border border-border-subtle">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <Input
                      label="Threshold"
                      type="number"
                      value={tier.threshold}
                      onChange={(e) => updateBonusTier(index, { threshold: parseInt(e.target.value) || 0 })}
                      placeholder="20"
                    />
                    <Input
                      label="Amount"
                      type="number"
                      value={tier.amount}
                      onChange={(e) => updateBonusTier(index, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="600000"
                    />
                    <Input
                      label="Label"
                      type="text"
                      value={tier.label || ""}
                      onChange={(e) => updateBonusTier(index, { label: e.target.value })}
                      placeholder="Every 20 pax"
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={tier.repeatable}
                          onChange={(e) => updateBonusTier(index, { repeatable: e.target.checked })}
                          className="rounded border-border"
                        />
                        Repeatable
                      </label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBonusTier(index)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={addBonusTier}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bonus Tier
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>
            <Save className="h-4 w-4 mr-2" />
            {template ? "Update" : "Create"} Template
          </Button>
        </div>
      </div>
    </Modal>
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
            <label className="block text-sm font-medium text-primary mb-2">
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
                  ? "bg-accent-success/10 border border-accent-success/20 text-accent-success"
                  : searchResult.alreadyAdded
                  ? "bg-accent-warning/10 border border-accent-warning/20 text-accent-warning"
                  : "bg-raised border border-border text-secondary"
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
            <p className="text-xs text-secondary mb-3">
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
        <div className="text-xs text-secondary">
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
