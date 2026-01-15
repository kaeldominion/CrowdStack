"use client";

import { useState } from "react";
import { Modal, Badge, Button, VipStatus, Input, Textarea } from "@crowdstack/ui";
import {
  User,
  Mail,
  Phone,
  Crown,
  Star,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  AlertTriangle,
  CalendarCheck,
  Percent,
  StickyNote,
} from "lucide-react";
import Image from "next/image";

// Instagram icon component
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

interface CheckInConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmWithOverride?: (reason?: string) => void;
  onSaveNotes?: (notes: string) => Promise<void>;
  data: {
    attendee: {
      id: string;
      name: string;
      surname?: string | null;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      instagram_handle?: string | null;
    };
    vip_status: {
      isVip: boolean;
      isGlobalVip: boolean;
      isVenueVip: boolean;
      isOrganizerVip: boolean;
      vipReasons: string[];
    };
    xp: {
      total: number;
      at_venue: number;
    };
    attendance?: {
      total_events: number;
      total_checkins: number;
      checkin_rate: number;
      venue_events: number;
      venue_checkins: number;
    };
    notes?: string | null;
    notes_updated_at?: string | null;
    notes_updated_by_name?: string | null;
    feedback_history: Array<{
      id: string;
      rating: number;
      feedback_type: "positive" | "negative";
      comment?: string | null;
      submitted_at: string;
      event_name: string;
      event_date?: string | null;
    }>;
    table_party?: {
      isTableParty: boolean;
      tableName: string | null;
      hostName: string | null;
      isHost: boolean;
      checkedInCount: number;
      partySize: number;
      zoneName: string | null;
      bookingId: string | null;
      notes: string | null;
    } | null;
    cutoff_status?: {
      isPastCutoff: boolean;
      cutoffTime: string | null;
      cutoffTimeFormatted: string | null;
    };
    already_checked_in: boolean;
    checked_in_at?: string | null;
    registered_at: string;
  } | null;
  loading?: boolean;
  confirming?: boolean;
}

export function CheckInConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onConfirmWithOverride,
  onSaveNotes,
  data,
  loading = false,
  confirming = false,
}: CheckInConfirmationModalProps) {
  const [overrideReason, setOverrideReason] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(data?.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  // Sync notesValue when data changes
  if (data?.notes !== undefined && notesValue !== (data.notes || "") && !editingNotes) {
    setNotesValue(data.notes || "");
  }

  const handleSaveNotes = async () => {
    if (!onSaveNotes) return;
    setSavingNotes(true);
    try {
      await onSaveNotes(notesValue);
      setEditingNotes(false);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Guest Entry" size="lg">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary">Loading guest details...</div>
        </div>
      ) : !data ? (
        <div className="py-12 text-center">
          <XCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-secondary">Failed to load guest details</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Guest Photo and Basic Info */}
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden bg-accent-secondary/20 flex-shrink-0">
              {data.attendee.avatar_url ? (
                <Image
                  src={data.attendee.avatar_url}
                  alt={data.attendee.full_name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-primary truncate">
                  {data.attendee.full_name}
                </h2>
                {data.vip_status.isVip && (
                  <Crown className="h-5 w-5 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <VipStatus
                  isGlobalVip={data.vip_status.isGlobalVip}
                  isVenueVip={data.vip_status.isVenueVip}
                  isOrganizerVip={data.vip_status.isOrganizerVip}
                  size="md"
                />
              </div>
              <div className="space-y-1.5">
                {data.attendee.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-secondary" />
                    <span className="text-secondary">{data.attendee.email}</span>
                  </div>
                )}
                {data.attendee.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-secondary" />
                    <span className="text-secondary">{data.attendee.phone}</span>
                  </div>
                )}
                {data.attendee.instagram_handle && (
                  <div className="flex items-center gap-2 text-sm">
                    <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />
                    <a
                      href={`https://instagram.com/${data.attendee.instagram_handle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:text-pink-400 transition-colors"
                    >
                      @{data.attendee.instagram_handle.replace('@', '')}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-secondary">
                    Registered: {formatDate(data.registered_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Already Checked In Warning */}
          {data.already_checked_in && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-warning" />
                <h3 className="font-semibold text-primary">Already Checked In</h3>
              </div>
              {data.checked_in_at && (
                <p className="text-sm text-secondary">
                  Checked in at: {formatDate(data.checked_in_at)}
                </p>
              )}
            </div>
          )}

          {/* Past Cutoff Warning */}
          {data.cutoff_status?.isPastCutoff && !data.already_checked_in && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-primary">Past Check-in Cutoff</h3>
              </div>
              <p className="text-sm text-secondary mb-3">
                The check-in cutoff time ({data.cutoff_status.cutoffTimeFormatted}) has passed.
                You can still allow entry with an override.
              </p>
              <div>
                <label className="text-xs text-secondary block mb-1">
                  Override Reason (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., VIP guest, delayed arrival"
                  value={overrideReason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverrideReason(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* VIP Reasons */}
          {data.vip_status.isVip && data.vip_status.vipReasons.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-primary">VIP Status</h3>
              </div>
              <ul className="space-y-1">
                {data.vip_status.vipReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-secondary flex items-start gap-2">
                    <Star className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Table Party Info */}
          {data.table_party?.isTableParty && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  <h3 className="font-semibold text-primary">Table Booking</h3>
                </div>
                {data.table_party.isHost && (
                  <Badge variant="primary" className="text-xs">Table Host</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <span className="text-xs text-secondary">Table</span>
                  <p className="font-semibold text-primary">{data.table_party.tableName || "TBA"}</p>
                </div>
                {data.table_party.zoneName && (
                  <div>
                    <span className="text-xs text-secondary">Zone</span>
                    <p className="font-semibold text-primary">{data.table_party.zoneName}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-secondary">Party Progress</span>
                <span className="font-semibold text-primary">
                  {data.table_party.checkedInCount} / {data.table_party.partySize} checked in
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-raised rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (data.table_party.checkedInCount / Math.max(1, data.table_party.partySize)) * 100)}%`
                  }}
                />
              </div>

              {!data.table_party.isHost && data.table_party.hostName && (
                <p className="text-sm text-secondary">
                  <strong>Host:</strong> {data.table_party.hostName}
                </p>
              )}

              {data.table_party.notes && (
                <div className="mt-3 p-2 bg-raised rounded border border-border-subtle">
                  <span className="text-xs text-secondary block mb-1">Booking Notes</span>
                  <p className="text-sm text-primary">{data.table_party.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="h-3 w-3 text-accent-secondary" />
                <span className="text-[10px] text-secondary font-medium">Total XP</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {data.xp.total.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
              <div className="flex items-center gap-1 mb-0.5">
                <Star className="h-3 w-3 text-accent-primary" />
                <span className="text-[10px] text-secondary font-medium">House XP</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {data.xp.at_venue.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-1 mb-0.5">
                <CalendarCheck className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] text-secondary font-medium">Events</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {data.attendance?.total_checkins || 0}/{data.attendance?.total_events || 0}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-1 mb-0.5">
                <Percent className="h-3 w-3 text-green-400" />
                <span className="text-[10px] text-secondary font-medium">Check-in %</span>
              </div>
              <p className="text-lg font-bold text-primary">
                {data.attendance?.checkin_rate || 0}%
              </p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="p-3 rounded-lg bg-raised border border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-secondary" />
                <h3 className="font-semibold text-primary text-sm">Notes</h3>
              </div>
              {onSaveNotes && !editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                >
                  {data.notes ? "Edit" : "Add Note"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notesValue}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this attendee..."
                  className="text-sm min-h-[60px]"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(data.notes || "");
                    }}
                    className="text-xs text-secondary hover:text-primary transition-colors px-2 py-1"
                    disabled={savingNotes}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="text-xs bg-accent-primary text-white px-3 py-1 rounded hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                  >
                    {savingNotes ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : data.notes ? (
              <div>
                <p className="text-sm text-secondary whitespace-pre-wrap">{data.notes}</p>
                {data.notes_updated_by_name && (
                  <p className="text-[10px] text-secondary/60 mt-1">
                    Last edited by {data.notes_updated_by_name}
                    {data.notes_updated_at && (
                      <> • {new Date(data.notes_updated_at).toLocaleString()}</>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-secondary/60 italic">No notes added</p>
            )}
          </div>

          {/* Feedback History */}
          {data.feedback_history.length > 0 && (
            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-secondary" />
                <h3 className="font-semibold text-primary text-sm">Recent Feedback</h3>
                <Badge variant="default" className="text-[10px]">
                  {data.feedback_history.length}
                </Badge>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {data.feedback_history.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="flex items-center gap-2 p-2 rounded border border-border-subtle bg-raised text-xs"
                  >
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-2.5 w-2.5 ${
                            star <= feedback.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    {/* Type Badge */}
                    <Badge
                      variant={feedback.feedback_type === "positive" ? "success" : "warning"}
                      className="text-[9px] px-1.5 py-0 flex-shrink-0"
                    >
                      {feedback.feedback_type}
                    </Badge>
                    {/* Event Name */}
                    <span className="font-medium text-primary truncate flex-1 min-w-0">
                      {feedback.event_name}
                    </span>
                    {/* Comment (if short) */}
                    {feedback.comment && feedback.comment.length < 40 && (
                      <span className="text-secondary truncate max-w-[120px]">
                        "{feedback.comment}"
                      </span>
                    )}
                    {/* Date */}
                    <span className="text-[10px] text-secondary font-mono flex-shrink-0">
                      {feedback.event_date
                        ? new Date(feedback.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : new Date(feedback.submitted_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={confirming}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (data.cutoff_status?.isPastCutoff && !data.already_checked_in && onConfirmWithOverride) {
                  onConfirmWithOverride(overrideReason || undefined);
                } else {
                  onConfirm();
                }
              }}
              disabled={confirming}
              className={`flex-1 ${data.cutoff_status?.isPastCutoff && !data.already_checked_in ? '!bg-amber-500 hover:!bg-amber-600' : ''}`}
            >
              {confirming ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Confirming...
                </>
              ) : data.already_checked_in ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Details
                </>
              ) : data.cutoff_status?.isPastCutoff ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Override & Check In
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Entry
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
