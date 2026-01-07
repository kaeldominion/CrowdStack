"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Input } from "@crowdstack/ui";
import { ArrowLeft, QrCode, Plus, Edit2, Trash2, Copy, Check, ExternalLink, Download } from "lucide-react";
import { BeautifiedQRCode } from "@/components/BeautifiedQRCode";

interface DynamicQRCode {
  id: string;
  code: string;
  name: string;
  target_url: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizerQRCodesPage() {
  const [qrCodes, setQrCodes] = useState<DynamicQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    target_url: "",
  });

  useEffect(() => {
    setBaseUrl(window.location.origin);
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    try {
      const response = await fetch("/api/organizer/qr-codes");
      if (response.ok) {
        const data = await response.json();
        setQrCodes(data.qrCodes || []);
      } else {
        console.error("Failed to load QR codes");
      }
    } catch (error) {
      console.error("Error loading QR codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/organizer/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadQRCodes();
        setFormData({ code: "", name: "", target_url: "" });
        setShowCreateForm(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create QR code");
      }
    } catch (error) {
      console.error("Error creating QR code:", error);
      alert("Failed to create QR code");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/organizer/qr-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          target_url: formData.target_url,
        }),
      });

      if (response.ok) {
        await loadQRCodes();
        setEditingId(null);
        setFormData({ code: "", name: "", target_url: "" });
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update QR code");
      }
    } catch (error) {
      console.error("Error updating QR code:", error);
      alert("Failed to update QR code");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this QR code?")) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/qr-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadQRCodes();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete QR code");
      }
    } catch (error) {
      console.error("Error deleting QR code:", error);
      alert("Failed to delete QR code");
    }
  };

  const startEdit = (qrCode: DynamicQRCode) => {
    setEditingId(qrCode.id);
    setFormData({
      code: qrCode.code,
      name: qrCode.name,
      target_url: qrCode.target_url,
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ code: "", name: "", target_url: "" });
    setShowCreateForm(false);
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getQRUrl = (code: string) => {
    return `${baseUrl}/qr/${code}`;
  };

  const downloadQRCode = async (code: string) => {
    const qrUrl = getQRUrl(code);
    const size = 512;
    const logoSize = 80;
    
    try {
      const QRCode = (await import("qrcode")).default;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      
      await QRCode.toCanvas(canvas, qrUrl, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const logo = new Image();
      logo.crossOrigin = "anonymous";
      
      logo.onload = () => {
        const centerX = size / 2;
        const centerY = size / 2;
        const logoX = centerX - logoSize / 2;
        const logoY = centerY - logoSize / 2;

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2 + 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-code-${code}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };

      logo.onerror = () => {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `qr-code-${code}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };

      logo.src = "/logos/crowdstack-icon-tricolor-on-transparent.png";
    } catch (error) {
      console.error("Error generating QR code for download:", error);
      alert("Failed to generate QR code for download");
    }
  };

  return (
    <Section spacing="lg">
      <Container>
        <div className="mb-8">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-secondary/20 rounded-lg border border-accent-secondary/30">
                <QrCode className="w-6 h-6 text-accent-secondary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Dynamic QR Codes</h1>
                <p className="text-sm text-secondary">
                  Create reusable QR codes that can point to different URLs dynamically
                </p>
              </div>
            </div>
            {!showCreateForm && !editingId && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create QR Code
              </Button>
            )}
          </div>
        </div>

        {(showCreateForm || editingId) && (
          <Card className="!p-6 mb-8">
            <h2 className="text-lg font-semibold text-primary mb-4">
              {editingId ? "Edit QR Code" : "Create New QR Code"}
            </h2>
            <form
              onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Code <span className="text-accent-error">*</span>
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="event-window-sign"
                  disabled={!!editingId}
                  required
                  className="font-mono"
                />
                <p className="text-xs text-secondary mt-1">
                  Unique identifier (alphanumeric, hyphens, underscores only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Name <span className="text-accent-error">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Event Window Sign"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Target URL <span className="text-accent-error">*</span>
                </label>
                <Input
                  type="url"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  placeholder="https://example.com/event/register?ref=organizer"
                  required
                />
                <p className="text-xs text-secondary mt-1">
                  You can change this anytime without reprinting the QR code
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit">
                  {editingId ? "Update QR Code" : "Create QR Code"}
                </Button>
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-secondary">Loading QR codes...</p>
          </div>
        ) : qrCodes.length === 0 ? (
          <Card className="!p-12 !border-dashed">
            <div className="text-center">
              <QrCode className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                No QR codes yet
              </h3>
              <p className="text-sm text-secondary mb-6">
                Create your first dynamic QR code to get started
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create QR Code
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {qrCodes.map((qrCode) => (
              <Card key={qrCode.id} className="!p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      {qrCode.name}
                    </h3>
                    <span className="text-xs font-mono text-secondary bg-raised px-2 py-1 rounded">
                      {qrCode.code}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(qrCode)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDelete(qrCode.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-center">
                  <BeautifiedQRCode
                    url={getQRUrl(qrCode.code)}
                    size={200}
                    logoSize={40}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-secondary uppercase tracking-widest mb-2">
                    QR Code URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={getQRUrl(qrCode.code)}
                      readOnly
                      className="font-mono text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyToClipboard(getQRUrl(qrCode.code), qrCode.code)}
                    >
                      {copiedCode === qrCode.code ? (
                        <Check className="h-4 w-4 text-accent-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-secondary uppercase tracking-widest mb-2">
                    Current Target URL
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={qrCode.target_url}
                      readOnly
                      className="font-mono text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(qrCode.target_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-border-subtle">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadQRCode(qrCode.code)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(getQRUrl(qrCode.code), "_blank")}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}

