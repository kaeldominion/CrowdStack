"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  LoadingSpinner,
  Select,
} from "@crowdstack/ui";
import { Search, UserPlus, Trash2, Users, DollarSign, Plus, X, Repeat, Target } from "lucide-react";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type?: "promoter" | "user";
  user_id?: string;
}

interface BonusTier {
  threshold: number;
  amount: number;
  repeatable: boolean;
  label?: string;
}

interface EventPromoter {
  id: string;
  commission_type: string;
  commission_config: any;
  currency?: string | null;
  per_head_rate?: number | null;
  per_head_min?: number | null;
  per_head_max?: number | null;
  bonus_threshold?: number | null;
  bonus_amount?: number | null;
  bonus_tiers?: BonusTier[] | null;
  fixed_fee?: number | null;
  minimum_guests?: number | null;
  below_minimum_percent?: number | null;
  promoter: Promoter | null;
  registrations: number;
}

interface PromoterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventCurrency?: string;
  onUpdate?: () => void;
  context?: "venue" | "organizer";
}

const CURRENCIES = [
  { value: "IDR", label: "IDR - Indonesian Rupiah" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "THB", label: "THB - Thai Baht" },
  { value: "MYR", label: "MYR - Malaysian Ringgit" },
];

export function PromoterManagementModal({
  isOpen,
  onClose,
  eventId,
  eventCurrency = "IDR",
  onUpdate,
  context = "organizer",
}: PromoterManagementModalProps) {
  const [eventPromoters, setEventPromoters] = useState<EventPromoter[]>([]);
  const [availablePromoters, setAvailablePromoters] = useState<Promoter[]>([]);
  const [searchResults, setSearchResults] = useState<Array<Promoter & { type?: "promoter" | "user"; user_id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState<Promoter & { type?: "promoter" | "user"; user_id?: string } | null>(null);
  const [addingPromoterId, setAddingPromoterId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Currency
  const [currency, setCurrency] = useState<string>("");

  // Per Head fields
  const [perHeadRate, setPerHeadRate] = useState<string>("");
  const [perHeadMin, setPerHeadMin] = useState<string>("");
  const [perHeadMax, setPerHeadMax] = useState<string>("");

  // Fixed Fee with minimum requirement
  const [fixedFee, setFixedFee] = useState<string>("");
  const [minimumGuests, setMinimumGuests] = useState<string>("");
  const [belowMinimumPercent, setBelowMinimumPercent] = useState<string>("50");

  // Legacy single bonus (for simple cases)
  const [bonusThreshold, setBonusThreshold] = useState<string>("");
  const [bonusAmount, setBonusAmount] = useState<string>("");

  // Tiered bonuses
  const [useTieredBonuses, setUseTieredBonuses] = useState(false);
  const [bonusTiers, setBonusTiers] = useState<BonusTier[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadEventPromoters();
      loadAvailablePromoters();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    // Debounced search
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPromotersAndUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, eventId]);

  const loadEventPromoters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/promoters`);
      if (!response.ok) throw new Error("Failed to load promoters");
      const data = await response.json();
      setEventPromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading event promoters:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePromoters = async () => {
    try {
      const endpoint = context === "venue" 
        ? "/api/venue/promoters" 
        : "/api/organizer/promoters";
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Failed to load available promoters");
      const data = await response.json();
      setAvailablePromoters(data.promoters || []);
    } catch (error) {
      console.error("Error loading available promoters:", error);
    }
  };

  const searchPromotersAndUsers = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/events/${eventId}/promoters/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Failed to search");
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching promoters/users:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addBonusTier = () => {
    setBonusTiers([
      ...bonusTiers,
      { threshold: 20, amount: 0, repeatable: false, label: "" },
    ]);
  };

  const updateBonusTier = (index: number, updates: Partial<BonusTier>) => {
    const newTiers = [...bonusTiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    setBonusTiers(newTiers);
  };

  const removeBonusTier = (index: number) => {
    setBonusTiers(bonusTiers.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCurrency("");
    setPerHeadRate("");
    setPerHeadMin("");
    setPerHeadMax("");
    setFixedFee("");
    setMinimumGuests("");
    setBelowMinimumPercent("50");
    setBonusThreshold("");
    setBonusAmount("");
    setUseTieredBonuses(false);
    setBonusTiers([]);
  };

  const selectPromoter = (promoter: Promoter & { type?: "promoter" | "user"; user_id?: string }) => {
    setSelectedPromoter(promoter);
  };

  const addPromoter = async () => {
    if (!selectedPromoter) return;

    try {
      const promoter = selectedPromoter;
      const identifier = promoter.id.startsWith("user-") ? promoter.user_id : promoter.id;
      setAddingPromoterId(identifier || promoter.id);
      
      const body: any = {
        commission_type: "enhanced", // New type to indicate enhanced model
        commission_config: {},
        assigned_by: context,
        // Currency (null uses event default)
        currency: currency || null,
        // Per head
        per_head_rate: perHeadRate ? parseFloat(perHeadRate) : null,
        per_head_min: perHeadMin ? parseInt(perHeadMin) : null,
        per_head_max: perHeadMax ? parseInt(perHeadMax) : null,
        // Fixed fee with minimum
        fixed_fee: fixedFee ? parseFloat(fixedFee) : null,
        minimum_guests: minimumGuests ? parseInt(minimumGuests) : null,
        below_minimum_percent: minimumGuests ? parseFloat(belowMinimumPercent) : null,
      };

      // Bonus handling
      if (useTieredBonuses && bonusTiers.length > 0) {
        body.bonus_tiers = bonusTiers.filter(t => t.threshold > 0 && t.amount > 0);
      } else if (bonusThreshold && bonusAmount) {
        // Legacy single bonus
        body.bonus_threshold = parseInt(bonusThreshold);
        body.bonus_amount = parseFloat(bonusAmount);
      }

      // If it's a user (not yet a promoter), send user_id; otherwise send promoter_id
      if (promoter.type === "user" && promoter.user_id) {
        body.user_id = promoter.user_id;
      } else {
        body.promoter_id = promoter.id;
      }

      const response = await fetch(`/api/events/${eventId}/promoters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add promoter");
      }

      await loadEventPromoters();
      await loadAvailablePromoters();
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPromoter(null);
      setShowAddSection(false);
      resetForm();
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || "Failed to add promoter");
    } finally {
      setAddingPromoterId(null);
    }
  };

  const removePromoter = async (eventPromoterId: string) => {
    if (!confirm("Are you sure you want to remove this promoter from the event?")) {
      return;
    }

    try {
      setRemovingId(eventPromoterId);
      const response = await fetch(
        `/api/events/${eventId}/promoters?event_promoter_id=${eventPromoterId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove promoter");
      }

      await loadEventPromoters();
      onUpdate?.();
    } catch (error: any) {
      alert(error.message || "Failed to remove promoter");
    } finally {
      setRemovingId(null);
    }
  };

  const formatCurrency = (amount: number, curr?: string | null) => {
    const c = curr || eventCurrency;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter out promoters already assigned to this event
  const assignedPromoterIds = new Set(
    eventPromoters.map((ep) => ep.promoter?.id).filter(Boolean)
  );

  const displayPromoters = searchQuery.length >= 2 
    ? searchResults.filter((p) => !assignedPromoterIds.has(p.id))
    : availablePromoters.filter((p) => {
        if (assignedPromoterIds.has(p.id)) return false;
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.email?.toLowerCase().includes(query) ||
          p.phone?.includes(query)
        );
      });

  const renderPayoutSummary = (ep: EventPromoter) => {
    const curr = ep.currency || eventCurrency;
    const parts: JSX.Element[] = [];

    // Per head
    if (ep.per_head_rate) {
      parts.push(
        <Badge key="per_head" variant="default" className="mr-1 mb-1">
          {formatCurrency(ep.per_head_rate, curr)}/head
          {ep.per_head_min ? ` (min ${ep.per_head_min})` : ""}
          {ep.per_head_max ? ` (max ${ep.per_head_max})` : ""}
        </Badge>
      );
    }

    // Fixed fee
    if (ep.fixed_fee && ep.fixed_fee > 0) {
      let fixedLabel = formatCurrency(ep.fixed_fee, curr);
      if (ep.minimum_guests && ep.below_minimum_percent !== 100) {
        fixedLabel += ` (${ep.below_minimum_percent}% if <${ep.minimum_guests} guests)`;
      }
      parts.push(
        <Badge key="fixed" variant="secondary" className="mr-1 mb-1">
          Fixed: {fixedLabel}
        </Badge>
      );
    }

    // Tiered bonuses
    if (ep.bonus_tiers && ep.bonus_tiers.length > 0) {
      ep.bonus_tiers.forEach((tier, idx) => {
        parts.push(
          <Badge 
            key={`tier-${idx}`} 
            variant={tier.repeatable ? "warning" : "success"} 
            className="mr-1 mb-1"
          >
            {tier.repeatable ? (
              <><Repeat className="h-3 w-3 mr-1 inline" />{formatCurrency(tier.amount, curr)} every {tier.threshold}</>
            ) : (
              <><Target className="h-3 w-3 mr-1 inline" />{formatCurrency(tier.amount, curr)} @ {tier.threshold}</>
            )}
          </Badge>
        );
      });
    } else if (ep.bonus_threshold && ep.bonus_amount) {
      // Legacy single bonus
      parts.push(
        <Badge key="bonus" variant="success" className="mr-1 mb-1">
          Bonus: {formatCurrency(ep.bonus_amount, curr)} @ {ep.bonus_threshold} guests
        </Badge>
      );
    }

    // Currency indicator if different from event
    if (ep.currency && ep.currency !== eventCurrency) {
      parts.push(
        <Badge key="currency" variant="outline" className="mr-1 mb-1">
          {ep.currency}
        </Badge>
      );
    }

    if (parts.length === 0) {
      return <span className="text-secondary">No payout configured</span>;
    }

    return <div className="flex flex-wrap">{parts}</div>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Event Promoters"
      size="xl"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Current Promoters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Promoters ({eventPromoters.length})
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddSection(!showAddSection)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Promoter
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner text="Loading promoters..." size="md" />
            </div>
          ) : eventPromoters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Payout Terms</TableHead>
                  <TableHead>Check-ins</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventPromoters.map((ep) => (
                  <TableRow key={ep.id}>
                    <TableCell>
                      <div className="font-medium">{ep.promoter?.name || "Unknown"}</div>
                      <div className="text-xs text-secondary">{ep.promoter?.email || "-"}</div>
                    </TableCell>
                    <TableCell>{renderPayoutSummary(ep)}</TableCell>
                    <TableCell>
                      <Badge variant="success">{ep.registrations}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePromoter(ep.id)}
                        disabled={removingId === ep.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-secondary border border-dashed border-border rounded-lg">
              No promoters assigned yet
            </div>
          )}
        </div>

        {/* Add Promoter Section */}
        {showAddSection && (
          <div className="border-t border-border pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-primary mb-2">
              Add a Promoter
            </h3>
              <p className="text-sm text-secondary">
                Step 1: Search and select a promoter below, then configure their payment terms.
              </p>
            </div>

            {/* Step 1: Search and Select */}
            <div className="mb-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary" />
                <Input
                  placeholder="Search promoters by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Available Promoters List */}
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
              {searching ? (
                <div className="text-center py-8 text-secondary">
                  Searching...
                </div>
              ) : displayPromoters.length > 0 ? (
                <div className="divide-y divide-border">
                  {displayPromoters.slice(0, 20).map((promoter) => (
                    <div
                      key={promoter.id}
                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                          selectedPromoter?.id === promoter.id
                            ? "bg-accent-primary/10 border-l-2 border-accent-primary"
                            : "hover:bg-raised"
                        }`}
                        onClick={() => selectPromoter(promoter)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-primary flex items-center gap-2">
                          {promoter.name}
                          {promoter.type === "user" && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                              New
                            </span>
                          )}
                            {selectedPromoter?.id === promoter.id && (
                              <Badge variant="success" size="sm">Selected</Badge>
                          )}
                        </div>
                        <div className="text-sm text-secondary">
                          {promoter.email || promoter.phone || "No contact info"}
                        </div>
                      </div>
                      <Button
                          variant={selectedPromoter?.id === promoter.id ? "primary" : "ghost"}
                        size="sm"
                          onClick={(e) => {
                            e?.stopPropagation();
                            selectPromoter(promoter);
                          }}
                        >
                          {selectedPromoter?.id === promoter.id ? "Selected" : "Select"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary">
                  {searchQuery.length >= 2
                    ? "No promoters or users found matching your search"
                    : searchQuery
                    ? "Type at least 2 characters to search"
                      : "Search for a promoter above to get started"}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Configure Payment Terms - Only shown if promoter selected */}
            {selectedPromoter ? (
              <div className="space-y-5 p-4 rounded-lg bg-active/30 border border-border-subtle">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-primary">Step 2: Configure Payment Terms</h4>
                    <Badge variant="outline" size="sm">Optional</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPromoter(null)}
                  >
                    Change Promoter
                  </Button>
                </div>
                <div className="mb-4 p-3 bg-base rounded-lg border border-border-subtle">
                  <p className="text-sm text-primary font-medium">Selected: {selectedPromoter.name}</p>
                  <p className="text-xs text-secondary">{selectedPromoter.email || selectedPromoter.phone || "No contact info"}</p>
                </div>
                <p className="text-xs text-secondary mb-4">
                  Configure payment terms below, or leave empty to set up later. Click "Add Promoter" at the bottom when ready.
                </p>
              
              {/* Currency Override */}
              <div>
                <Select
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { value: "", label: `Use event default (${eventCurrency})` },
                    ...CURRENCIES,
                  ]}
                />
              </div>

              {/* Per Head Section */}
              <div className="border-t border-border-subtle pt-4">
                <h5 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Per Head Payment
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Amount Per Head
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={perHeadRate}
                      onChange={(e) => setPerHeadRate(e.target.value)}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Min Guests
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={perHeadMin}
                      onChange={(e) => setPerHeadMin(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Max Guests
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={perHeadMax}
                      onChange={(e) => setPerHeadMax(e.target.value)}
                      placeholder="∞"
                    />
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  Leave empty if not using per-head payment
                </p>
              </div>

              {/* Fixed Fee Section */}
              <div className="border-t border-border-subtle pt-4">
                <h5 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Fixed Fee
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Fixed Amount
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="100000"
                      value={fixedFee}
                      onChange={(e) => setFixedFee(e.target.value)}
                      placeholder="3000000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Minimum Guests Required
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={minimumGuests}
                      onChange={(e) => setMinimumGuests(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      % If Below Minimum
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={belowMinimumPercent}
                      onChange={(e) => setBelowMinimumPercent(e.target.value)}
                      placeholder="50"
                    />
                  </div>
                </div>
                <p className="text-xs text-secondary mt-2">
                  Example: 3M fee, min 15 guests, 50% if not met = 1.5M if they bring {"<"}15
                </p>
              </div>

              {/* Bonus Section */}
              <div className="border-t border-border-subtle pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-medium text-primary flex items-center gap-2">
                    <Target className="h-4 w-4" /> Bonuses
                  </h5>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={useTieredBonuses}
                      onChange={(e) => setUseTieredBonuses(e.target.checked)}
                      className="rounded border-border"
                    />
                    Use tiered/repeatable bonuses
                  </label>
                </div>

                {!useTieredBonuses ? (
                  // Simple single bonus
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Bonus Threshold (guests)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={bonusThreshold}
                        onChange={(e) => setBonusThreshold(e.target.value)}
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-1">
                        Bonus Amount
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="100000"
                        value={bonusAmount}
                        onChange={(e) => setBonusAmount(e.target.value)}
                        placeholder="1000000"
                      />
                    </div>
                  </div>
                ) : (
                  // Tiered bonuses
                  <div className="space-y-3">
                    {bonusTiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-base rounded-lg border border-border-subtle">
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs text-secondary mb-1">Threshold</label>
                            <Input
                              type="number"
                              min="1"
                              value={tier.threshold}
                              onChange={(e) => updateBonusTier(index, { threshold: parseInt(e.target.value) || 0 })}
                              placeholder="20"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-secondary mb-1">Amount</label>
                            <Input
                              type="number"
                              min="0"
                              value={tier.amount}
                              onChange={(e) => updateBonusTier(index, { amount: parseFloat(e.target.value) || 0 })}
                              placeholder="600000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-secondary mb-1">Label</label>
                            <Input
                              type="text"
                              value={tier.label || ""}
                              onChange={(e) => updateBonusTier(index, { label: e.target.value })}
                              placeholder="Every 20 pax"
                            />
                          </div>
                          <div className="flex items-end gap-2 pb-1">
                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={tier.repeatable}
                                onChange={(e) => updateBonusTier(index, { repeatable: e.target.checked })}
                                className="rounded border-border"
                              />
                              <Repeat className="h-3 w-3" />
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
                    <p className="text-xs text-secondary">
                      <strong>Repeatable:</strong> Bonus awarded every X guests (e.g., 600k every 20 pax = 3 bonuses for 60 guests)
                      <br />
                      <strong>One-time:</strong> Bonus awarded once when threshold is reached
                    </p>
                  </div>
                )}
              </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-base border border-border-subtle text-center">
                <p className="text-sm text-secondary">
                  Select a promoter above to configure payment terms
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div>
            {selectedPromoter && (
              <p className="text-xs text-secondary">
                Ready to add <strong className="text-primary">{selectedPromoter.name}</strong>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {showAddSection && selectedPromoter && (
              <Button
                variant="primary"
                onClick={addPromoter}
                disabled={!selectedPromoter || addingPromoterId !== null}
                loading={addingPromoterId !== null}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Promoter
              </Button>
            )}
          <Button variant="ghost" onClick={onClose}>
              {showAddSection ? "Cancel" : "Close"}
          </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
