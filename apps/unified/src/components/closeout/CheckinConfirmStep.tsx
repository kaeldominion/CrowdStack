"use client";

import { useState } from "react";
import { Card, Button, Input, Modal } from "@crowdstack/ui";
import { Eye, Edit2, Users, Clock } from "lucide-react";
import type { CloseoutSummary } from "@crowdstack/shared/types";

interface Attendee {
  registration_id: string;
  attendee_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  checked_in_at: string;
}

interface CheckinConfirmStepProps {
  summary: CloseoutSummary;
  eventId: string;
  onNext: () => void;
  onBack: () => void;
  onCheckinOverrideUpdate: (
    promoterId: string,
    overrideCount: number | null,
    reason: string | null
  ) => Promise<void>;
  onReload: () => Promise<void>;
}

export function CheckinConfirmStep({
  summary,
  eventId,
  onNext,
  onBack,
  onCheckinOverrideUpdate,
  onReload,
}: CheckinConfirmStepProps) {
  const [editingPromoter, setEditingPromoter] = useState<string | null>(null);
  const [overrideCount, setOverrideCount] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [viewingPromoter, setViewingPromoter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const handleEdit = (promoter: (typeof summary.promoters)[0]) => {
    setEditingPromoter(promoter.promoter_id);
    setOverrideCount(promoter.manual_checkins_override?.toString() || "");
    setOverrideReason(promoter.manual_checkins_reason || "");
  };

  const handleSave = async (promoterId: string) => {
    setSaving(true);
    try {
      const count = overrideCount.trim() === "" ? null : parseInt(overrideCount, 10);
      const reason = overrideReason.trim() || null;

      // Validate: if override is set, reason is required
      if (count !== null && !reason) {
        alert("Please provide a reason for the override");
        setSaving(false);
        return;
      }

      await onCheckinOverrideUpdate(promoterId, count, reason);
      setEditingPromoter(null);
      setOverrideCount("");
      setOverrideReason("");
      await onReload();
    } catch (err) {
      console.error("Failed to save override:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async (promoterId: string) => {
    setSaving(true);
    try {
      await onCheckinOverrideUpdate(promoterId, null, null);
      setEditingPromoter(null);
      setOverrideCount("");
      setOverrideReason("");
      await onReload();
    } catch (err) {
      console.error("Failed to clear override:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingPromoter(null);
    setOverrideCount("");
    setOverrideReason("");
  };

  const handleViewAttendees = async (promoterId: string, promoterName: string) => {
    setViewingPromoter({ id: promoterId, name: promoterName });
    setLoadingAttendees(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/closeout/attendees?promoter_id=${promoterId}`
      );
      if (!response.ok) {
        throw new Error("Failed to load attendees");
      }
      const data = await response.json();
      setAttendees(data.attendees || []);
    } catch (err) {
      console.error("Failed to load attendees:", err);
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleCloseAttendees = () => {
    setViewingPromoter(null);
    setAttendees([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          Confirm Check-ins
        </h3>
        <p className="text-sm text-secondary">
          Review the final check-in counts for each promoter. You can manually
          adjust counts if attendees were missed. Click on a promoter to view
          their checked-in attendees.
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
                className="p-4 rounded-lg bg-active/50 border border-border-subtle space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-primary">
                        {promoter.promoter_name}
                      </div>
                      {promoter.manual_checkins_override !== null && (
                        <div className="text-xs text-accent-warning mt-1">
                          Override active (actual: {promoter.actual_checkins_count})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {promoter.checkins_count} check-ins
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleViewAttendees(
                            promoter.promoter_id,
                            promoter.promoter_name
                          )
                        }
                        title="View attendees"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(promoter)}
                        title="Edit count"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {editingPromoter === promoter.promoter_id && (
                  <div className="pt-3 border-t border-border-subtle space-y-3">
                    <div className="text-xs text-secondary mb-2">
                      Actual check-ins from system: {promoter.actual_checkins_count}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Override Count"
                        type="number"
                        min="0"
                        value={overrideCount}
                        onChange={(e) => setOverrideCount(e.target.value)}
                        placeholder={promoter.actual_checkins_count.toString()}
                        helperText="Leave empty to use actual count"
                      />
                      <div />
                    </div>
                    <Input
                      label="Reason for Override"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g., Missed check-ins at door"
                      helperText="Required when setting an override"
                    />
                    <div className="flex justify-between">
                      {promoter.manual_checkins_override !== null && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClearOverride(promoter.promoter_id)}
                          disabled={saving}
                          className="text-accent-error"
                        >
                          Clear Override
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
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
                  </div>
                )}

                {promoter.manual_checkins_reason &&
                  editingPromoter !== promoter.promoter_id && (
                    <div className="text-xs text-secondary pt-2 border-t border-border-subtle">
                      Override reason: {promoter.manual_checkins_reason}
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Attendees Modal */}
      <Modal
        isOpen={viewingPromoter !== null}
        onClose={handleCloseAttendees}
        title={`Checked-in Attendees - ${viewingPromoter?.name || ""}`}
        size="lg"
      >
        <div className="space-y-4">
          {loadingAttendees ? (
            <div className="py-8 text-center text-secondary">
              Loading attendees...
            </div>
          ) : attendees.length === 0 ? (
            <div className="py-8 text-center text-secondary">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No checked-in attendees found for this promoter</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-secondary">
                {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}{" "}
                checked in
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.registration_id}
                    className="p-3 rounded-lg bg-active/50 border border-border-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-primary">
                          {attendee.name}
                        </div>
                        {attendee.email && (
                          <div className="text-xs text-secondary mt-1 truncate">
                            {attendee.email}
                          </div>
                        )}
                        {attendee.phone && (
                          <div className="text-xs text-secondary">
                            {attendee.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-secondary whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {new Date(attendee.checked_in_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-end pt-4 border-t border-border-subtle">
            <Button variant="secondary" onClick={handleCloseAttendees}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

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
