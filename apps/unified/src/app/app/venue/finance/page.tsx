"use client";

import { VenueFinanceSection } from "@/components/venue/VenueFinanceSection";
import { Card } from "@crowdstack/ui";

export default function VenueFinancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-[var(--text-primary)]">
          Finance
        </h1>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Manage payment settings and payout templates
        </p>
      </div>

      <Card>
        <VenueFinanceSection />
      </Card>
    </div>
  );
}
