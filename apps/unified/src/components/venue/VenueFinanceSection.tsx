"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Card, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Input, Textarea, Select, LoadingSpinner } from "@crowdstack/ui";
import { VenuePaymentSettings } from "@/components/VenuePaymentSettings";
import { DollarSign, FileText, Plus, Star, Edit2, Trash2, Settings } from "lucide-react";
import type { PromoterPayoutTemplate, BonusTier } from "@crowdstack/shared/types";

export function VenueFinanceSection() {
  const [activeTab, setActiveTab] = useState<"payments" | "templates">("payments");
  const [templates, setTemplates] = useState<PromoterPayoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromoterPayoutTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await fetch("/api/venue/payout-templates");
      if (!response.ok) throw new Error("Failed to load templates");
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSetDefaultTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/venue/payout-templates/${templateId}/set-default`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to set default template");
      await loadTemplates();
    } catch (error) {
      console.error("Failed to set default template:", error);
      alert("Failed to set default template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/venue/payout-templates/${templateId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("Failed to delete template");
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "payments" | "templates")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">Payment Setup</TabsTrigger>
            <TabsTrigger value="templates">Payout Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4">
            <VenuePaymentSettings />
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-primary">Payout Templates</h4>
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
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border-2 border-border rounded-lg hover:border-accent-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="text-base font-semibold text-primary">{template.name}</h5>
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
                            {(template as any).table_commission_type && (
                              <Badge variant="outline">
                                Table: {(template as any).table_commission_type === "percentage" 
                                  ? `${(template as any).table_commission_rate}%` 
                                  : `${((template as any).table_commission_flat_fee || 0).toLocaleString()} ${template.currency || "IDR"}`}
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
          </TabsContent>
        </Tabs>
      </div>

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
    </>
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
  const [tableCommissionType, setTableCommissionType] = useState<string>((template as any)?.table_commission_type || "");
  const [tableCommissionRate, setTableCommissionRate] = useState((template as any)?.table_commission_rate?.toString() || "");
  const [tableCommissionFlatFee, setTableCommissionFlatFee] = useState((template as any)?.table_commission_flat_fee?.toString() || "");

  const CURRENCIES_LIST = [
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
        ? `/api/venue/payout-templates/${template.id}`
        : "/api/venue/payout-templates";
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
        table_commission_type: tableCommissionType || null,
        table_commission_rate: tableCommissionRate ? parseFloat(tableCommissionRate) : null,
        table_commission_flat_fee: tableCommissionFlatFee ? parseFloat(tableCommissionFlatFee) : null,
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
            ...CURRENCIES_LIST,
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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useTieredBonuses ?? false}
                onChange={(e) => setUseTieredBonuses(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-primary">Use tiered bonuses</span>
            </label>
          </div>

          {useTieredBonuses ? (
            <div className="space-y-3">
              {bonusTiers.map((tier, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <Input
                    label="Threshold"
                    type="number"
                    value={tier.threshold.toString()}
                    onChange={(e) => updateBonusTier(index, { threshold: parseInt(e.target.value) || 0 })}
                    className="flex-1"
                  />
                  <Input
                    label="Amount"
                    type="number"
                    value={tier.amount.toString()}
                    onChange={(e) => updateBonusTier(index, { amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1"
                  />
                  <Input
                    label="Label (Optional)"
                    value={tier.label || ""}
                    onChange={(e) => updateBonusTier(index, { label: e.target.value })}
                    placeholder="e.g., VIP Bonus"
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1 pb-2">
                    <input
                      type="checkbox"
                      checked={tier.repeatable || false}
                      onChange={(e) => updateBonusTier(index, { repeatable: e.target.checked })}
                      className="rounded border-border"
                    />
                    <span className="text-xs text-secondary">Repeat</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBonusTier(index)}
                    className="text-accent-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addBonusTier}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Bonus Threshold (Guests)"
                type="number"
                value={bonusThreshold}
                onChange={(e) => setBonusThreshold(e.target.value)}
                placeholder="50"
              />
              <Input
                label="Bonus Amount"
                type="number"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-primary mb-3">Table Commission</h4>
          <div className="space-y-3">
            <Select
              label="Commission Type"
              value={tableCommissionType}
              onChange={(e) => setTableCommissionType(e.target.value)}
              options={[
                { value: "", label: "No table commission" },
                { value: "percentage", label: "Percentage" },
                { value: "flat_fee", label: "Flat Fee" },
              ]}
            />
            {tableCommissionType === "percentage" && (
              <Input
                label="Commission Rate (%)"
                type="number"
                min="0"
                max="100"
                value={tableCommissionRate}
                onChange={(e) => setTableCommissionRate(e.target.value)}
                placeholder="10"
              />
            )}
            {tableCommissionType === "flat_fee" && (
              <Input
                label="Flat Fee Amount"
                type="number"
                value={tableCommissionFlatFee}
                onChange={(e) => setTableCommissionFlatFee(e.target.value)}
                placeholder="100000"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {template ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
