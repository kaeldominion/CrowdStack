"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input, Badge, Select } from "@crowdstack/ui";
import { QrCode, Plus, Copy, Check } from "lucide-react";
import type { InviteQRCode } from "@/lib/data/invite-codes";

export default function EventInvitesPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [inviteQRCodes, setInviteQRCodes] = useState<InviteQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [eventPromoters, setEventPromoters] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPromoterId, setSelectedPromoterId] = useState<string>("");

  useEffect(() => {
    loadInviteQRCodes();
    loadEventPromoters();
  }, [eventId]);

  const loadEventPromoters = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/promoters`);
      if (response.ok) {
        const data = await response.json();
        const promoters = (data.promoters || []).map((ep: any) => ({
          id: ep.promoter?.id,
          name: ep.promoter?.name || "Unknown",
        })).filter((p: any) => p.id);
        setEventPromoters(promoters);
      }
    } catch (error) {
      console.error("Error loading event promoters:", error);
    }
  };

  const loadInviteQRCodes = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/invites`);
      if (!response.ok) throw new Error("Failed to load invite codes");
      const data = await response.json();
      setInviteQRCodes(data.invite_qr_codes || []);
    } catch (error) {
      console.error("Error loading invite codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createInviteQR = async (maxUses?: number, expiresAt?: string) => {
    try {
      const body: any = { max_uses: maxUses, expires_at: expiresAt };
      if (selectedPromoterId) {
        body.promoter_id = selectedPromoterId;
      }
      
      const response = await fetch(`/api/events/${eventId}/invites/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to create invite QR");
      await loadInviteQRCodes();
      setShowCreate(false);
      setSelectedPromoterId(""); // Reset selection
    } catch (error) {
      console.error("Error creating invite QR:", error);
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const url = `${window.location.origin}/i/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inviteCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getQRCodeUrl = (inviteCode: string) => {
    // Generate QR code URL (using a QR code service or library)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `${window.location.origin}/i/${inviteCode}`
    )}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-foreground-muted">Loading invite codes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">Invite QR Codes</h1>
          <p className="mt-2 text-sm text-white/60">
            Generate QR codes to invite attendees to your event
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New
        </Button>
      </div>

      {showCreate && (
        <Card>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Create Invite QR Code</h3>
            
            {eventPromoters.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                  Assign to Promoter (Optional)
                </label>
                <Select
                  value={selectedPromoterId}
                  onChange={(e) => setSelectedPromoterId(e.target.value)}
                  options={[
                    { value: "", label: "None (General Invite)" },
                    ...eventPromoters.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  helperText="Select a promoter to attribute registrations to them, or leave as 'None' for general invite"
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button onClick={() => createInviteQR()}>
                {selectedPromoterId ? "Create for Promoter" : "Create (Unlimited)"}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowCreate(false);
                  setSelectedPromoterId("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inviteQRCodes.map((inviteQR) => (
          <Card key={inviteQR.id}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-white">{inviteQR.invite_code}</p>
                  <p className="text-xs text-white/60">Created {new Date(inviteQR.created_at).toLocaleDateString()}</p>
                  {inviteQR.owner_name && (
                    <p className="text-xs text-white/40 mt-1">
                      {inviteQR.promoter_id && inviteQR.creator_role === "event_organizer" && "For Promoter: "}
                      {inviteQR.promoter_id && inviteQR.creator_role === "venue_admin" && "For Promoter: "}
                      {!inviteQR.promoter_id && inviteQR.creator_role === "event_organizer" && "Organizer: "}
                      {!inviteQR.promoter_id && inviteQR.creator_role === "venue_admin" && "Venue: "}
                      {inviteQR.creator_role === "promoter" && "Promoter: "}
                      {inviteQR.owner_name}
                    </p>
                  )}
                </div>
                {inviteQR.max_uses && (
                  <Badge variant="warning">
                    {inviteQR.used_count} / {inviteQR.max_uses}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-center p-4 bg-white rounded-md">
                <img src={getQRCodeUrl(inviteQR.invite_code)} alt="QR Code" className="w-32 h-32" />
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => copyInviteLink(inviteQR.invite_code)}
                >
                  {copiedId === inviteQR.invite_code ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-white/60">
                  {inviteQR.expires_at
                    ? `Expires ${new Date(inviteQR.expires_at).toLocaleDateString()}`
                    : "No expiration"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {inviteQRCodes.length === 0 && (
        <Card>
          <div className="p-12 text-center">
            <QrCode className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No invite QR codes yet</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              Create First Invite QR Code
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
