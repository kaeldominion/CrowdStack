"use client";

import { Card, Button } from "@crowdstack/ui";
import type { CloseoutSummary } from "@crowdstack/shared/types";

interface CheckinConfirmStepProps {
  summary: CloseoutSummary;
  onNext: () => void;
  onBack: () => void;
}

export function CheckinConfirmStep({
  summary,
  onNext,
  onBack,
}: CheckinConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          Confirm Check-ins
        </h3>
        <p className="text-sm text-secondary">
          Review the final check-in counts for each promoter. These numbers will
          be used to calculate payouts.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border-subtle">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Total Check-ins
              </div>
              <div className="text-2xl font-bold text-primary">
                {summary.total_checkins}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-secondary mb-1">
                Promoters
              </div>
              <div className="text-2xl font-bold text-primary">
                {summary.promoters.length}
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
              Check-ins by Promoter
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
                </div>
                <div className="text-lg font-bold text-primary">
                  {promoter.checkins_count} check-ins
                </div>
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
          Continue to Payouts
        </Button>
      </div>
    </div>
  );
}

