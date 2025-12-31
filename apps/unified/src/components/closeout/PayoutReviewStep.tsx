"use client";

import { useState } from "react";
import { Card, Button, Input } from "@crowdstack/ui";
import type { CloseoutSummary } from "@crowdstack/shared/types";

interface PayoutReviewStepProps {
  summary: CloseoutSummary;
  onNext: () => void;
  onBack: () => void;
  onAdjustmentUpdate: (
    promoterId: string,
    adjustmentAmount: number | null,
    adjustmentReason: string | null
  ) => Promise<void>;
  onReload: () => Promise<void>;
}

export function PayoutReviewStep({
  summary,
  onNext,
  onBack,
  onAdjustmentUpdate,
  onReload,
}: PayoutReviewStepProps) {
  const [editingPromoter, setEditingPromoter] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (promoter: (typeof summary.promoters)[0]) => {
    setEditingPromoter(promoter.promoter_id);
    setAdjustmentAmount(
      promoter.manual_adjustment_amount?.toString() || ""
    );
    setAdjustmentReason(promoter.manual_adjustment_reason || "");
  };

  const handleSave = async (promoterId: string) => {
    setSaving(true);
    try {
      const amount =
        adjustmentAmount.trim() === ""
          ? null
          : parseFloat(adjustmentAmount);
      const reason = adjustmentReason.trim() || null;

      await onAdjustmentUpdate(promoterId, amount, reason);
      setEditingPromoter(null);
      setAdjustmentAmount("");
      setAdjustmentReason("");
    } catch (err) {
      console.error("Failed to save adjustment:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPromoter(null);
    setAdjustmentAmount("");
    setAdjustmentReason("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          Review Payouts
        </h3>
        <p className="text-sm text-secondary">
          Review calculated payouts for each promoter. You can add manual
          adjustments if needed.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border-subtle">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Total Payout
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(summary.total_payout)}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Currency
              </div>
              <div className="text-2xl font-bold text-primary">
                {summary.currency}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary">
              Payout Details
            </div>
            {summary.promoters.map((promoter) => (
              <div
                key={promoter.promoter_id}
                className="p-4 rounded-lg bg-active/50 border border-border-subtle space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-primary">
                      {promoter.promoter_name}
                    </div>
                    <div className="text-xs text-secondary mt-1">
                      {promoter.checkins_count} check-ins
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(promoter.final_payout)}
                    </div>
                    {promoter.manual_adjustment_amount !== null &&
                      promoter.manual_adjustment_amount !== 0 && (
                        <div className="text-xs text-secondary mt-1">
                          {promoter.manual_adjustment_amount > 0 ? "+" : ""}
                          {formatCurrency(promoter.manual_adjustment_amount)}
                        </div>
                      )}
                  </div>
                </div>

                {editingPromoter === promoter.promoter_id ? (
                  <div className="pt-3 border-t border-border-subtle space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Adjustment Amount"
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        placeholder="0.00"
                        helperText="Positive or negative amount"
                      />
                      <div className="flex items-end">
                        <div className="text-xs text-secondary">
                          Calculated: {formatCurrency(promoter.calculated_payout)}
                        </div>
                      </div>
                    </div>
                    <Input
                      label="Adjustment Reason"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Reason for adjustment (required)"
                      helperText="Required for audit trail"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleSave(promoter.promoter_id)}
                        loading={saving}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-border-subtle">
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-secondary">
                        Calculated: {formatCurrency(promoter.calculated_payout)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(promoter)}
                      >
                        {promoter.manual_adjustment_amount !== null &&
                        promoter.manual_adjustment_amount !== 0
                          ? "Edit Adjustment"
                          : "Add Adjustment"}
                      </Button>
                    </div>
                    {promoter.manual_adjustment_reason && (
                      <div className="mt-2 text-xs text-secondary">
                        Reason: {promoter.manual_adjustment_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}

