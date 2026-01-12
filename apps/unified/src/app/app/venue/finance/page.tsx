"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VenueFinancePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const venueId = searchParams.get("venueId");

  useEffect(() => {
    // Redirect to settings page with finance tab active
    const url = venueId 
      ? `/app/venue/settings?venueId=${venueId}&tab=finance`
      : `/app/venue/settings?tab=finance`;
    router.replace(url);
  }, [venueId, router]);

  return (
    <div className="space-y-8 pt-4">
      <div className="text-center py-12">
        <p className="text-secondary">Redirecting to Finance settings...</p>
      </div>
    </div>
  );
}
