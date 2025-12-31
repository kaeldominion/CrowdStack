"use client";

import { useState } from "react";
import { Card, Button, Input } from "@crowdstack/ui";
import type { CloseoutSummary } from "@crowdstack/shared/types";

interface FinalizeStepProps {
  summary: CloseoutSummary;
  onNext: () => void;
  onBack: () => void;
  onFinalize: (data: {
    total_revenue?: number;
    closeout_notes?: string;
  }) => Promise<void>;
  loading: boolean;
}

export function FinalizeStep({
  summary,
  onBack,
  onFinalize,
  loading,
}: FinalizeStepProps) {
  const [totalRevenue, setTotalRevenue] = useState<string>("");
  const [closeoutNotes, setCloseoutNotes] = useState<string>("");

  const handleFinalize = async () => {
    await onFinalize({
      total_revenue: totalRevenue ? parseFloat(totalRevenue) : undefined,
      closeout_notes: closeoutNotes || undefined,
    });
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
          Finalize Event Closeout
        </h3>
        <p className="text-sm text-secondary">
          Review the summary and add any optional information before finalizing.
          Once finalized, payouts will be locked and statements will be
          generated.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border-subtle">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Total Check-ins
              </div>
              <div className="text-xl font-bold text-primary">
                {summary.total_checkins}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Total Payout
              </div>
              <div className="text-xl font-bold text-primary">
                {formatCurrency(summary.total_payout)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary">
              Promoters ({summary.promoters.length})
            </div>
            {summary.promoters.map((promoter) => (
              <div
                key={promoter.promoter_id}
                className="flex items-center justify-between p-3 rounded-lg bg-active/50 border border-border-subtle"
              >
                <div>
                  <div className="font-medium text-primary">
                    {promoter.promoter_name}
                  </div>
                  <div className="text-xs text-secondary">
                    {promoter.checkins_count} check-ins
                  </div>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(promoter.final_payout)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-primary mb-2">
              Optional Information
            </h4>
            <p className="text-xs text-secondary mb-4">
              These fields are optional and can be used for internal reporting.
            </p>
          </div>

          <Input
            label="Total Event Revenue"
            type="number"
            value={totalRevenue}
            onChange={(e) => setTotalRevenue(e.target.value)}
            placeholder="0.00"
            helperText={`Enter total revenue in ${summary.currency} (optional)`}
          />

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Closeout Notes
            </label>
            <textarea
              className="w-full rounded-xl bg-raised border border-border-subtle px-4 py-3 font-mono text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20 min-h-[100px]"
              value={closeoutNotes}
              onChange={(e) => setCloseoutNotes(e.target.value)}
              placeholder="Any notes about the event or closeout process..."
            />
            <p className="mt-1.5 text-sm text-secondary">
              Internal notes (not visible to promoters)
            </p>
          </div>
        </div>
      </Card>

      <div className="p-4 rounded-xl bg-accent-primary/10 border border-accent-primary/30">
        <p className="text-sm text-primary">
          <strong>Warning:</strong> Once you finalize this event, check-ins will
          be locked and payouts will be generated. You will not be able to
          modify check-ins or payout calculations after finalization.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleFinalize}
          loading={loading}
        >
          Finalize Event
        </Button>
      </div>
    </div>
  );
}

