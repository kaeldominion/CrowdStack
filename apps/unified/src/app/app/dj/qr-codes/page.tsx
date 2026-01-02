"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input, Badge } from "@crowdstack/ui";
import { QrCode, Plus, Copy, Check, Calendar, MapPin } from "lucide-react";
import type { InviteQRCode } from "@/lib/data/invite-codes";
import { BeautifiedQRCode } from "@/components/BeautifiedQRCode";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  venue_name: string | null;
}

export default function DJQRCodesPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [inviteQRCodes, setInviteQRCodes] = useState<InviteQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadInviteQRCodes(selectedEventId);
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      // DJs use the same promoter events API since they have promoter profiles
      const response = await fetch("/api/promoter/dashboard-events");
      if (response.ok) {
        const data = await response.json();
        const allEvents = [
          ...(data.liveEvents || []),
          ...(data.upcomingEvents || []),
          ...(data.pastEvents || []),
        ];
        setEvents(allEvents);
        if (allEvents.length > 0 && !selectedEventId) {
          setSelectedEventId(allEvents[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInviteQRCodes = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/invites`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show QR codes for this DJ's promoter profile
        const djCodes = (data.invite_qr_codes || []).filter(
          (code: InviteQRCode) => code.creator_role === "promoter"
        );
        setInviteQRCodes(djCodes);
      }
    } catch (error) {
      console.error("Error loading invite codes:", error);
    }
  };

  const createInviteQR = async () => {
    if (!selectedEventId) {
      alert("Please select an event");
      return;
    }

    try {
      const body: any = {};
      if (maxUses) {
        body.max_uses = parseInt(maxUses);
      }
      if (expiresAt) {
        body.expires_at = expiresAt;
      }

      const response = await fetch(`/api/events/${selectedEventId}/invites/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create QR code");
      }

      await loadInviteQRCodes(selectedEventId);
      setShowCreate(false);
      setMaxUses("");
      setExpiresAt("");
    } catch (error: any) {
      alert(error.message || "Failed to create QR code");
    }
  };

  const copyInviteLink = (inviteCode: string, eventSlug: string) => {
    const url = `${window.location.origin}/e/${eventSlug}/register?ref=${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inviteCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getQRCodeUrl = (inviteCode: string, eventSlug: string) => {
    return `${window.location.origin}/e/${eventSlug}/register?ref=${inviteCode}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">QR Codes</h1>
        <p className="text-secondary">Generate QR codes to track referrals and earn commissions</p>
      </div>

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold text-primary mb-2">No events yet</h3>
          <p className="text-secondary">
            You'll be able to generate QR codes once you're added to event lineups
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Event Selector */}
          <Card className="p-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-2 bg-surface border border-border-subtle rounded-lg text-primary"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} • {formatDate(event.start_time)}
                </option>
              ))}
            </select>
          </Card>

          {selectedEvent && (
            <>
              {/* Event Info */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-primary mb-2">
                      {selectedEvent.name}
                    </h2>
                    <div className="space-y-1 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(selectedEvent.start_time)}</span>
                      </div>
                      {selectedEvent.venue_name && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedEvent.venue_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate QR Code
                  </Button>
                </div>

                {/* Create QR Code Form */}
                {showCreate && (
                  <Card className="p-4 mt-4 bg-surface-hover">
                    <div className="space-y-4">
                      <Input
                        label="Max Uses (Optional)"
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        placeholder="Leave empty for unlimited"
                      />
                      <Input
                        label="Expires At (Optional)"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Button onClick={createInviteQR}>Create QR Code</Button>
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </Card>

              {/* QR Codes List */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Your QR Codes ({inviteQRCodes.length})
                </h3>
                {inviteQRCodes.length === 0 ? (
                  <Card className="p-12 text-center">
                    <QrCode className="w-12 h-12 text-secondary mx-auto mb-3" />
                    <p className="text-secondary">No QR codes generated yet</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inviteQRCodes.map((code) => (
                      <Card key={code.id} className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-mono font-bold text-primary mb-1">
                                {code.invite_code}
                              </p>
                              <div className="text-xs text-secondary space-y-1">
                                <p>Used: {code.used_count} / {code.max_uses || "∞"}</p>
                                {code.expires_at && (
                                  <p>Expires: {formatDate(code.expires_at)}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-center">
                            <BeautifiedQRCode
                              url={getQRCodeUrl(code.invite_code, selectedEvent.slug)}
                              size={150}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => copyInviteLink(code.invite_code, selectedEvent.slug)}
                              className="flex-1"
                            >
                              {copiedId === code.invite_code ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Link
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

