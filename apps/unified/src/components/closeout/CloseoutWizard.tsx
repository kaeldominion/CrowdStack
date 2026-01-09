"use client";

import { useState, useEffect } from "react";
import { Modal, Button } from "@crowdstack/ui";
import { CheckinConfirmStep } from "./CheckinConfirmStep";
import { PayoutReviewStep } from "./PayoutReviewStep";
import { FinalizeStep } from "./FinalizeStep";
import type { CloseoutSummary } from "@crowdstack/shared/types";

interface CloseoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function CloseoutWizard({
  isOpen,
  onClose,
  eventId,
  eventName,
  onSuccess,
}: CloseoutWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [summary, setSummary] = useState<CloseoutSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load summary when modal opens
  useEffect(() => {
    if (isOpen && !summary) {
      loadSummary();
    }
  }, [isOpen]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/closeout`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load closeout summary");
      }
      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || "Failed to load closeout summary");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSummary(null);
    setError(null);
    onClose();
  };

  const handleFinalize = async (finalizeData: {
    total_revenue?: number;
    closeout_notes?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/closeout/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalizeData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to finalize closeout");
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to finalize closeout");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentUpdate = async (
    promoterId: string,
    adjustmentAmount: number | null,
    adjustmentReason: string | null
  ) => {
    try {
      const response = await fetch(`/api/events/${eventId}/closeout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoter_id: promoterId,
          manual_adjustment_amount: adjustmentAmount,
          manual_adjustment_reason: adjustmentReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update adjustment");
      }

      // Reload summary to reflect changes
      await loadSummary();
    } catch (err: any) {
      setError(err.message || "Failed to update adjustment");
    }
  };

  const handleCheckinOverrideUpdate = async (
    promoterId: string,
    overrideCount: number | null,
    overrideReason: string | null
  ) => {
    try {
      const response = await fetch(`/api/events/${eventId}/closeout`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoter_id: promoterId,
          manual_checkins_override: overrideCount,
          manual_checkins_reason: overrideReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update checkin override");
      }

      // Reload summary to reflect changes
      await loadSummary();
    } catch (err: any) {
      setError(err.message || "Failed to update checkin override");
    }
  };

  const steps = [
    { number: 1, label: "Confirm Check-ins" },
    { number: 2, label: "Review Payouts" },
    { number: 3, label: "Optional Inputs" },
    { number: 4, label: "Finalize" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Close Event: ${eventName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    currentStep >= step.number
                      ? "bg-accent-primary text-white"
                      : "bg-active text-secondary border border-border-subtle"
                  }`}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    currentStep >= step.number ? "text-primary" : "text-secondary"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${
                    currentStep > step.number
                      ? "bg-accent-primary"
                      : "bg-border-subtle"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 rounded-xl bg-accent-error/10 border border-accent-error/30">
            <p className="text-sm text-accent-error">{error}</p>
          </div>
        )}

        {/* Step Content */}
        {loading && !summary ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-secondary">Loading closeout summary...</div>
          </div>
        ) : summary ? (
          <>
            {currentStep === 1 && (
              <CheckinConfirmStep
                summary={summary}
                eventId={eventId}
                onNext={handleNext}
                onBack={handleBack}
                onCheckinOverrideUpdate={handleCheckinOverrideUpdate}
                onReload={loadSummary}
              />
            )}
            {currentStep === 2 && (
              <PayoutReviewStep
                summary={summary}
                onNext={handleNext}
                onBack={handleBack}
                onAdjustmentUpdate={handleAdjustmentUpdate}
                onReload={loadSummary}
              />
            )}
            {currentStep === 3 && (
              <FinalizeStep
                summary={summary}
                onNext={handleNext}
                onBack={handleBack}
                onFinalize={handleFinalize}
                loading={loading}
              />
            )}
            {currentStep === 4 && (
              <div className="py-12 text-center">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-lg font-semibold text-primary mb-2">
                  Event Closed Successfully
                </h3>
                <p className="text-sm text-secondary mb-6">
                  Payouts have been generated and are now pending payment.
                </p>
                <Button onClick={handleClose} variant="primary">
                  Close
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-secondary">Failed to load closeout data</p>
            <Button onClick={loadSummary} variant="secondary" className="mt-4">
              Retry
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

