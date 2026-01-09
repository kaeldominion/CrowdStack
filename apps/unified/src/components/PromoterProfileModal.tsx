"use client";

import Link from "next/link";
import { Modal, Badge, Button } from "@crowdstack/ui";
import {
  Users,
  Mail,
  Phone,
  Calendar,
  Ticket,
  TrendingUp,
  Info,
  ExternalLink,
} from "lucide-react";

interface Promoter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  slug: string | null;
  created_at: string;
  events_count: number;
  referrals_count: number;
  checkins_count: number;
  conversion_rate: number;
  has_direct_assignment: boolean;
  has_indirect_assignment: boolean;
}

interface PromoterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  promoter: Promoter | null;
  context?: "venue" | "organizer";
}

export function PromoterProfileModal({
  isOpen,
  onClose,
  promoter,
  context = "organizer",
}: PromoterProfileModalProps) {
  if (!promoter) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Promoter Profile"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Users className="h-6 w-6" />
              {promoter.name}
            </h2>
            {promoter.slug && (
              <Link
                href={`/promoter/${promoter.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 mt-2 text-sm text-purple-400 hover:text-purple-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Public Profile
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {promoter.has_direct_assignment && (
              <Badge variant="default" className="text-xs">
                Direct Assignment
              </Badge>
            )}
            {promoter.has_indirect_assignment && (
              <Badge variant="secondary" className="text-xs">
                {context === "organizer" ? "Via Venue" : "Via Organizer"}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
            Contact Information
          </h3>
          <div className="space-y-2">
            {promoter.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-secondary" />
                <a
                  href={`mailto:${promoter.email}`}
                  className="text-primary hover:text-primary"
                >
                  {promoter.email}
                </a>
              </div>
            )}
            {promoter.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-secondary" />
                <a
                  href={`tel:${promoter.phone}`}
                  className="text-primary hover:text-primary"
                >
                  {promoter.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
            Performance Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-raised rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-secondary" />
                <span className="text-xs text-secondary uppercase">Events</span>
              </div>
              <p className="text-2xl font-bold text-primary">{promoter.events_count}</p>
            </div>
            <div className="p-4 bg-raised rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-secondary" />
                <span className="text-xs text-secondary uppercase">Referrals</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {promoter.referrals_count.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-raised rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="h-4 w-4 text-secondary" />
                <span className="text-xs text-secondary uppercase">Check-ins</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {promoter.checkins_count.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-raised rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <span className="text-xs text-secondary uppercase">Conversion</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {promoter.conversion_rate}%
              </p>
            </div>
          </div>
        </div>

        {/* Assignment Information */}
        {(promoter.has_direct_assignment || promoter.has_indirect_assignment) && (
          <div className="p-4 bg-raised rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-secondary">
                <p className="font-medium text-primary mb-1">Assignment Information</p>
                <p>
                  {promoter.has_direct_assignment && (
                    <>This promoter was assigned <strong>directly</strong> by you. </>
                  )}
                  {promoter.has_indirect_assignment && (
                    <>
                      This promoter was also assigned by{" "}
                      {context === "organizer" ? "the venue" : "an event organizer"} for some events.
                    </>
                  )}
                  This helps track relationships and maintain accountability while allowing
                  promoters to work with multiple parties.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
            Additional Information
          </h3>
          <div className="text-sm text-secondary">
            <p>Member since: {formatDate(promoter.created_at)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

