"use client";

import { Card } from "@crowdstack/ui";
import { Shirt, Users, FileText, CreditCard } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";

interface VenuePoliciesProps {
  venue: Venue;
}

export function VenuePolicies({ venue }: VenuePoliciesProps) {
  const hasPolicies =
    venue.dress_code ||
    venue.age_restriction ||
    venue.entry_notes ||
    venue.table_min_spend_notes;

  if (!hasPolicies) {
    return null;
  }

  return (
    <Card>
      <h2 className="text-2xl font-semibold text-primary mb-6">Policies</h2>
      <div className="space-y-6">
        {venue.dress_code && (
          <div className="flex gap-4">
            <Shirt className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-secondary mb-1">Dress Code</div>
              <div className="text-primary">{venue.dress_code}</div>
            </div>
          </div>
        )}

        {venue.age_restriction && (
          <div className="flex gap-4">
            <Users className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-secondary mb-1">Age Restriction</div>
              <div className="text-primary">{venue.age_restriction}</div>
            </div>
          </div>
        )}

        {venue.entry_notes && (
          <div className="flex gap-4">
            <FileText className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-secondary mb-1">Entry Notes</div>
              <div className="text-primary whitespace-pre-line">{venue.entry_notes}</div>
            </div>
          </div>
        )}

        {venue.table_min_spend_notes && (
          <div className="flex gap-4">
            <CreditCard className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-secondary mb-1">Table & VIP</div>
              <div className="text-primary whitespace-pre-line">{venue.table_min_spend_notes}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

