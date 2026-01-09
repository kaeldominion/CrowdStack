"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, InlineSpinner } from "@crowdstack/ui";
import { Calendar, MapPin, AlertCircle, ArrowLeft } from "lucide-react";
import { TableBookingSection } from "@/components/TableBookingSection";

interface BookingLinkData {
  link: {
    id: string;
    code: string;
    table_id: string | null;
  };
  event: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time: string | null;
    timezone: string | null;
    cover_image: string | null;
    venue: {
      id: string;
      name: string;
      slug: string;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    } | null;
  };
  table: {
    id: string;
    name: string;
    capacity: number;
    minimum_spend: number | null;
    deposit_amount: number | null;
    zone: { id: string; name: string } | null;
  } | null;
  availableTables: Array<{
    id: string;
    name: string;
    capacity: number;
    minimum_spend: number | null;
    deposit_amount: number | null;
    zone: { id: string; name: string } | null;
  }>;
  currency: string;
  currencySymbol: string;
}

export default function DirectBookingPage() {
  const params = useParams();
  const code = params.code as string;

  const [data, setData] = useState<BookingLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      fetchBookingLink();
    }
  }, [code]);

  const fetchBookingLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/book/${code}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load booking link");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <InlineSpinner className="mx-auto h-8 w-8" />
          <p className="mt-4 text-gray-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Booking Link Invalid</h1>
          <p className="text-gray-400 mb-6">{error || "This booking link could not be found."}</p>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { event, table } = data;
  const eventDate = new Date(event.start_time);

  // Format venue location
  const locationParts = [
    event.venue?.address,
    event.venue?.city,
    event.venue?.state,
    event.venue?.country,
  ].filter(Boolean);
  const location = locationParts.join(", ");

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Event Header */}
      <div className="relative">
        {event.cover_image && (
          <div className="absolute inset-0 h-64 overflow-hidden">
            <img
              src={event.cover_image}
              alt={event.name}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/80 to-gray-950" />
          </div>
        )}

        <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-4">
          {/* Back to Event Link */}
          <Link
            href={`/e/${event.slug}`}
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            View full event details
          </Link>

          {/* Event Info */}
          <div className="mb-6">
            {event.venue && (
              <p className="text-sm text-purple-400 mb-1">{event.venue.name}</p>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {event.name}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {eventDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                {eventDate.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>

            {location && (
              <p className="mt-2 text-sm text-gray-400 flex items-center gap-1">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                {location}
              </p>
            )}
          </div>

          {/* Specific Table Info (if link is for a specific table) */}
          {table && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-400 mb-1">
                You've been invited to book:
              </p>
              <p className="text-lg font-semibold text-white">
                {table.name}
                {table.zone && (
                  <span className="text-gray-400 font-normal"> - {table.zone.name}</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
                <span>Up to {table.capacity} guests</span>
                {table.minimum_spend && (
                  <span>Min spend: {data.currencySymbol}{table.minimum_spend.toLocaleString()}</span>
                )}
                {table.deposit_amount && (
                  <span className="text-yellow-400">
                    Deposit: {data.currencySymbol}{table.deposit_amount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Booking Section */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <TableBookingSection
          eventId={event.id}
          eventName={event.name}
          linkCode={code}
        />
      </div>
    </div>
  );
}
