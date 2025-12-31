"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { LoadingSpinner, Button } from "@crowdstack/ui";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { AdminVenueNav } from "@/components/AdminVenueNav";

interface VenueData {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  state?: string;
  address?: string;
}

export default function AdminVenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const venueId = params.venueId as string;
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenue();
  }, [venueId]);

  const loadVenue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/venues/${venueId}`);
      if (!response.ok) {
        throw new Error("Failed to load venue");
      }
      const data = await response.json();
      setVenue(data.venue);
    } catch (error) {
      console.error("Error loading venue:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading venue..." />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center py-8">
        <p className="text-secondary">Venue not found</p>
        <Link href="/admin/venues">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Venues
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/venues">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Venues
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {venue.name}
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              {venue.city && venue.state
                ? `${venue.city}, ${venue.state}`
                : venue.address || "No location"}
            </p>
          </div>
        </div>
        {venue.slug && (
          <Link
            href={`${process.env.NEXT_PUBLIC_WEB_URL || ""}/v/${venue.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </Button>
          </Link>
        )}
      </div>

      {/* Navigation Tabs */}
      <AdminVenueNav />

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

