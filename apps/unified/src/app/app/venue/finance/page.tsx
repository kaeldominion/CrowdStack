"use client";

import { VenueFinanceSection } from "@/components/venue/VenueFinanceSection";
import { Card } from "@crowdstack/ui";

import { DollarSign } from "lucide-react";

export default function VenueFinancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[var(--accent-secondary)]" />
          Finance
        </h1>
        <p className="page-description">
          Manage payment settings and payout templates
        </p>
      </div>

      <Card className="p-6">
        <VenueFinanceSection />
      </Card>
    </div>
  );
}
