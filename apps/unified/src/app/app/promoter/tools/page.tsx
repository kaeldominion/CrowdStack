"use client";

import { useState, useEffect } from "react";
import { BentoCard } from "@/components/BentoCard";
import { Button } from "@crowdstack/ui";
import { QrCode, Copy, Check, Calendar, MapPin, ExternalLink } from "lucide-react";
import { createBrowserClient } from "@crowdstack/shared";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  status: string;
  venue?: { name: string } | null;
}

export default function PromoterToolsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [promoterId, setPromoterId] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    loadPromoterId();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/promoter/events/my");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        if (data.events && data.events.length > 0) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPromoterId = async () => {
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: promoter } = await supabase
        .from("promoters")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (promoter) {
        setPromoterId(promoter.id);
      }
    } catch (error) {
      console.error("Error loading promoter ID:", error);
    }
  };

  const getReferralLink = (event: Event) => {
    if (!promoterId) return "";
    // Construct the web URL - in unified app, it's the same domain but without /app prefix
    // For local dev, use localhost:3000, for production use the same domain
    let webUrl = "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      // If we're on app.crowdstack.app, use crowdstack.app
      // If we're on app-beta.crowdstack.app, use beta.crowdstack.app
      // If we're on localhost, use localhost
      if (origin.includes("app.crowdstack.app")) {
        webUrl = origin.replace("app.crowdstack.app", "crowdstack.app");
      } else if (origin.includes("app-beta.crowdstack.app")) {
        webUrl = origin.replace("app-beta.crowdstack.app", "beta.crowdstack.app");
      } else {
        // Local dev - same origin
        webUrl = origin;
      }
    }
    return `${webUrl}/e/${event.slug}?ref=${promoterId}`;
  };

  const getQRCodeUrl = (event: Event) => {
    const link = getReferralLink(event);
    if (!link) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
  };

  const copyLink = (event: Event) => {
    const link = getReferralLink(event);
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedEventId(event.id);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading tools...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Promoter Tools</h1>
          <p className="mt-2 text-sm text-white/60">
            Generate referral links and QR codes for your events
          </p>
        </div>
        <BentoCard>
          <div className="text-center py-12">
            <QrCode className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No events assigned yet</p>
            <p className="text-sm text-white/40 mt-2">
              Once you're assigned to events, you'll be able to generate referral links and QR codes here.
            </p>
          </div>
        </BentoCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-white">Promoter Tools</h1>
        <p className="mt-2 text-sm text-white/60">
          Generate referral links and QR codes for your events
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Selector */}
        <div className="lg:col-span-1">
          <BentoCard>
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white">Select Event</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEvent?.id === event.id
                        ? "bg-white/10 border-white/20"
                        : "bg-white/5 border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{event.name}</div>
                    {event.venue && (
                      <div className="text-xs text-white/60 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue.name}
                      </div>
                    )}
                    <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.start_time).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </BentoCard>
        </div>

        {/* QR Code & Link Generator */}
        {selectedEvent && (
          <div className="lg:col-span-2">
            <BentoCard>
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">{selectedEvent.name}</h2>
                  {selectedEvent.venue && (
                    <p className="text-sm text-white/60 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedEvent.venue.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/5 border border-white/10">
                    {getQRCodeUrl(selectedEvent) ? (
                      <img
                        src={getQRCodeUrl(selectedEvent)!}
                        alt="QR Code"
                        className="w-48 h-48 mb-4"
                      />
                    ) : (
                      <QrCode className="w-48 h-48 text-white/20 mb-4" />
                    )}
                    <p className="text-xs text-white/60 text-center">
                      Scan to share your referral link
                    </p>
                  </div>

                  {/* Referral Link */}
                  <div className="flex flex-col justify-center space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-2">
                        Referral Link
                      </p>
                      <div className="flex items-center gap-2 p-3 rounded-md bg-white/5 border border-white/10">
                        <input
                          type="text"
                          value={getReferralLink(selectedEvent) || "Loading..."}
                          readOnly
                          className="flex-1 bg-transparent text-white text-sm font-mono text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(selectedEvent)}
                          className="shrink-0"
                        >
                          {copiedEventId === selectedEvent.id ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-xs text-white/60 mb-3">
                        Share this link or QR code to track referrals. Anyone who registers through this link will be attributed to you.
                      </p>
                      <button
                        onClick={() => {
                          const link = getReferralLink(selectedEvent);
                          if (link) {
                            window.open(link, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Event Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        )}
      </div>
    </div>
  );
}
