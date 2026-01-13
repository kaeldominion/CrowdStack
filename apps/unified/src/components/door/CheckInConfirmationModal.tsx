"use client";

import { Modal, Badge, Button, VipStatus } from "@crowdstack/ui";
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
  Calendar
} from "lucide-react";
import Image from "next/image";

interface CheckInConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    attendee: {
      id: string;
      name: string;
      surname?: string | null;
      full_name: string;
      email?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
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
      tableName: string;
      isHost: boolean;
      hostName?: string | null;
    } | null;
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
  data,
  loading = false,
  confirming = false,
}: CheckInConfirmationModalProps) {
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
          {data.table_party && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-purple-400" />
                <h3 className="font-semibold text-primary">Table Party</h3>
              </div>
              <p className="text-sm text-secondary mb-1">
                <strong>Table:</strong> {data.table_party.tableName}
              </p>
              {data.table_party.isHost ? (
                <Badge variant="primary" className="text-xs">Host</Badge>
              ) : data.table_party.hostName ? (
                <p className="text-sm text-secondary">
                  <strong>Host:</strong> {data.table_party.hostName}
                </p>
              ) : null}
            </div>
          )}

          {/* XP Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent-secondary" />
                <span className="text-xs text-secondary font-medium">Total XP</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {data.xp.total.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-accent-primary" />
                <span className="text-xs text-secondary font-medium">At Venue</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {data.xp.at_venue.toLocaleString()}
              </p>
            </div>
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
              onClick={onConfirm}
              disabled={confirming}
              className="flex-1"
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
