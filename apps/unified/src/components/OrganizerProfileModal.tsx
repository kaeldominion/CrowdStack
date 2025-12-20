"use client";

import { Modal, Badge } from "@crowdstack/ui";
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Users,
  Ticket,
  Star,
  StarOff,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Organizer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
  events_count: number;
  total_registrations: number;
  total_checkins: number;
  is_preapproved: boolean;
  partnership_id: string | null;
}

interface OrganizerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizer: Organizer | null;
  onPreapproveChange?: () => void;
  context?: "venue";
}

export function OrganizerProfileModal({
  isOpen,
  onClose,
  organizer,
  onPreapproveChange,
  context = "venue",
}: OrganizerProfileModalProps) {
  if (!organizer) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePreapproveToggle = async () => {
    if (!organizer) return;

    try {
      if (organizer.is_preapproved) {
        // Remove pre-approval
        if (!confirm("Remove pre-approved status? Their future events will need manual approval.")) {
          return;
        }
        const response = await fetch(
          `/api/venue/organizers/preapproved?id=${organizer.partnership_id}`,
          { method: "DELETE" }
        );
        if (response.ok) {
          onPreapproveChange?.();
        } else {
          const data = await response.json();
          alert(data.error || "Failed to remove pre-approved status");
        }
      } else {
        // Add pre-approval
        const response = await fetch("/api/venue/organizers/preapproved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizer_id: organizer.id }),
        });
        if (response.ok) {
          onPreapproveChange?.();
        } else {
          const data = await response.json();
          alert(data.error || "Failed to pre-approve organizer");
        }
      }
    } catch (error) {
      alert("Failed to update pre-approval status");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Organizer Profile"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {organizer.name}
            </h2>
            {organizer.company_name && (
              <p className="text-foreground-muted mt-1">{organizer.company_name}</p>
            )}
          </div>
          {organizer.is_preapproved ? (
            <Badge variant="default">
              <Star className="h-3 w-3 mr-1" />
              Pre-approved
            </Badge>
          ) : (
            <Badge variant="secondary">Standard</Badge>
          )}
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Contact Information
          </h3>
          <div className="space-y-2">
            {organizer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-foreground-muted" />
                <a
                  href={`mailto:${organizer.email}`}
                  className="text-foreground hover:text-primary"
                >
                  {organizer.email}
                </a>
              </div>
            )}
            {organizer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-foreground-muted" />
                <a
                  href={`tel:${organizer.phone}`}
                  className="text-foreground hover:text-primary"
                >
                  {organizer.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted uppercase">Events</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{organizer.events_count}</p>
            </div>
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted uppercase">Registrations</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {organizer.total_registrations.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 text-foreground-muted" />
                <span className="text-xs text-foreground-muted uppercase">Check-ins</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {organizer.total_checkins.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Additional Information
          </h3>
          <div className="text-sm text-foreground-muted">
            <p>Member since: {formatDate(organizer.created_at)}</p>
          </div>
        </div>

        {/* Actions */}
        {context === "venue" && (
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <button
              onClick={handlePreapproveToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                organizer.is_preapproved
                  ? "bg-background-secondary text-foreground hover:bg-background-tertiary"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {organizer.is_preapproved ? (
                <>
                  <StarOff className="h-4 w-4" />
                  Remove Pre-approval
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Pre-approve Organizer
                </>
              )}
            </button>
            <Link
              href={`/app/venue/events?organizer=${organizer.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-background-secondary text-foreground hover:bg-background-tertiary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View Events
            </Link>
          </div>
        )}
      </div>
    </Modal>
  );
}

