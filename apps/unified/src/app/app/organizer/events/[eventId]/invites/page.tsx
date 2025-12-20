"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Button, Input, Badge, Select } from "@crowdstack/ui";
import { QrCode, Plus, Copy, Check, Trash2 } from "lucide-react";
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
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadInviteQRCodes();
    loadEventPromoters();
    loadEventSlug();
  }, [eventId]);

  const loadEventSlug = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventSlug(data.event?.slug || null);
      }
    } catch (error) {
      console.error("Error loading event slug:", error);
    }
  };

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
      if (selectedPromoterId && selectedPromoterId !== "self") {
        body.promoter_id = selectedPromoterId;
      } else if (selectedPromoterId === "self") {
        body.self_promote = true; // Special flag for self-promotion
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

  const copyInviteLink = (inviteCode: string, promoterId?: string | null, selfPromote?: boolean) => {
    // If it's a promoter code or self-promote and we have event slug, link directly to registration
    // Otherwise, use the invite code page
    let url: string;
    if ((promoterId || selfPromote) && eventSlug) {
      url = `${window.location.origin}/e/${eventSlug}/register?ref=${inviteCode}`;
    } else {
      url = `${window.location.origin}/i/${inviteCode}`;
    }
    navigator.clipboard.writeText(url);
    setCopiedId(inviteCode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getQRCodeUrl = (inviteCode: string, promoterId?: string | null, selfPromote?: boolean) => {
    // If it's a promoter code or self-promote and we have event slug, link directly to registration
    // Otherwise, use the invite code page
    let targetUrl: string;
    if ((promoterId || selfPromote) && eventSlug) {
      targetUrl = `${window.location.origin}/e/${eventSlug}/register?ref=${inviteCode}`;
    } else {
      targetUrl = `${window.location.origin}/i/${inviteCode}`;
    }
    // Generate QR code URL (using a QR code service or library)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(targetUrl)}`;
  };

  const handleDelete = async (inviteQRId: string) => {
    if (!confirm("Are you sure you want to delete this QR code? This action cannot be undone.")) {
      return;
    }

    setDeletingId(inviteQRId);
    try {
      const response = await fetch(`/api/events/${eventId}/invites/${inviteQRId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete QR code");
      }
      await loadInviteQRCodes();
    } catch (error: any) {
      alert(error.message || "Failed to delete QR code");
    } finally {
      setDeletingId(null);
    }
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
            
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Assign to Promoter (Optional)
              </label>
              <Select
                value={selectedPromoterId}
                onChange={(e) => setSelectedPromoterId(e.target.value)}
                options={[
                  { value: "", label: "None (General Invite)" },
                  { value: "self", label: "Self Promote (Organizer)" },
                  ...eventPromoters.map((p) => ({ value: p.id, label: p.name })),
                ]}
                helperText={
                  selectedPromoterId === "self"
                    ? "QR code will link directly to registration page and attribute to your organizer profile"
                    : selectedPromoterId
                    ? "QR code will link directly to registration page and attribute to this promoter"
                    : "Select a promoter or 'Self Promote' to create a QR code that links directly to registration"
                }
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={() => createInviteQR()}>
                {selectedPromoterId === "self" 
                  ? "Create Self Promote QR Code" 
                  : selectedPromoterId 
                  ? "Create for Promoter" 
                  : "Create (Unlimited)"}
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-mono text-sm font-semibold text-white">{inviteQR.invite_code}</p>
                  <p className="text-xs text-white/60">Created {new Date(inviteQR.created_at).toLocaleDateString()}</p>
                  {inviteQR.owner_name && (
                    <div className="mt-1">
                      {inviteQR.self_promote ? (
                        <p className="text-xs text-purple-400 font-medium">
                          🎯 Self Promote: {inviteQR.owner_name}
                        </p>
                      ) : inviteQR.promoter_id ? (
                        <p className="text-xs text-blue-400 font-medium">
                          🎯 For Promoter: {inviteQR.owner_name}
                        </p>
                      ) : (
                        <p className="text-xs text-white/40">
                          {inviteQR.creator_role === "event_organizer" && "Organizer: "}
                          {inviteQR.creator_role === "venue_admin" && "Venue: "}
                          {inviteQR.creator_role === "promoter" && "Promoter: "}
                          {inviteQR.owner_name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {inviteQR.max_uses && (
                    <Badge variant="warning">
                      {inviteQR.used_count} / {inviteQR.max_uses}
                    </Badge>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(inviteQR.id)}
                    disabled={deletingId === inviteQR.id}
                    loading={deletingId === inviteQR.id}
                    className="!p-2"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>

              {(inviteQR.promoter_id || inviteQR.self_promote) && (
                <div className={`${inviteQR.self_promote ? 'bg-purple-500/10 border-purple-500/20' : 'bg-blue-500/10 border-blue-500/20'} border rounded-lg p-2 mb-2`}>
                  <p className={`text-xs ${inviteQR.self_promote ? 'text-purple-400' : 'text-blue-400'} font-medium text-center`}>
                    🎯 {inviteQR.self_promote ? 'Self Promote' : 'Promoter'} QR Code
                  </p>
                  <p className={`text-xs ${inviteQR.self_promote ? 'text-purple-300/70' : 'text-blue-300/70'} text-center mt-1`}>
                    Links directly to registration
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center p-4 bg-white rounded-md">
                <img src={getQRCodeUrl(inviteQR.invite_code, inviteQR.promoter_id, inviteQR.self_promote)} alt="QR Code" className="w-32 h-32" />
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => copyInviteLink(inviteQR.invite_code, inviteQR.promoter_id, inviteQR.self_promote)}
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
