"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Card, Badge, InlineSpinner } from "@crowdstack/ui";
import { Camera, Copy, Check, RefreshCw, QrCode, User, Calendar, MapPin, Users, Ticket, AlertCircle, CameraOff } from "lucide-react";

interface QRData {
  type: "pass" | "registration_url" | "unknown";
  raw: string;
  decoded?: {
    // For pass tokens
    registration_id?: string;
    event_id?: string;
    attendee_id?: string;
    exp?: number;
    iat?: number;
  };
  // Looked up data
  attendee?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  event?: {
    id: string;
    name: string;
    slug: string;
    start_time: string;
    end_time?: string;
    venue?: {
      id: string;
      name: string;
    };
  };
  registration?: {
    id: string;
    status: string;
    registered_at?: string;
    checked_in?: boolean;
  };
  referrer?: {
    type: "promoter" | "user" | "venue" | "organizer" | null;
    id?: string;
    name?: string;
    code?: string;
  };
  error?: string;
}

export default function QRTestPage() {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const handleQRCode = async (code: string) => {
    setLoading(true);
    setQrData(null);
    stopScanning();

    try {
      const response = await fetch("/api/dev/decode-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      setQrData(data);
    } catch (error: any) {
      setQrData({
        type: "unknown",
        raw: code,
        error: error.message || "Failed to decode QR code",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.log("Error stopping scanner:", e);
      }
    }
    setScanning(false);
  }, []);

  // QR Scanner using html5-qrcode (same as door scanner)
  const startScanning = async () => {
    setCameraError(null);
    setScanning(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-test-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          scanner.pause(true);
          handleQRCode(decodedText);
          setTimeout(() => {
            if (scannerRef.current) {
              try {
                scanner.resume();
              } catch (e) {
                console.log("Could not resume scanner");
              }
            }
          }, 2000);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Failed to access camera");
      setScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleQRCode(manualInput.trim());
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-void p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
            <QrCode className="h-7 w-7 text-accent-secondary" />
            QR Code Test Tool
          </h1>
          <p className="text-secondary text-sm">
            Scan or paste a QR code to see registration details
          </p>
        </div>

        {/* Scanner Section */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Scan QR Code</h2>
            {scanning ? (
              <Button variant="destructive" size="sm" onClick={stopScanning}>
                Stop Camera
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={startScanning}>
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            )}
          </div>

          {/* QR Reader container (html5-qrcode renders here) */}
          <div 
            id="qr-test-reader" 
            className="rounded-xl overflow-hidden bg-raised border border-border-subtle mb-4"
            style={{ 
              minHeight: scanning ? "300px" : "0",
              display: scanning ? "block" : "none",
            }}
          />

          {cameraError && (
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-3 mb-4">
              <CameraOff className="h-5 w-5 text-danger" />
              <div>
                <p className="text-sm font-medium text-danger">Camera Error</p>
                <p className="text-xs text-secondary">{cameraError}</p>
                <p className="text-xs text-secondary mt-1">
                  Make sure camera permissions are granted and you're using HTTPS.
                </p>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-secondary">
            Or paste the QR code content below
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Paste JWT token or URL..."
              className="flex-1 px-3 py-2 rounded-lg bg-glass border border-border text-primary text-sm placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent-secondary/50"
            />
            <Button type="submit" disabled={!manualInput.trim() || loading}>
              {loading ? <InlineSpinner size="sm" /> : "Decode"}
            </Button>
          </form>
        </Card>

        {/* Results Section */}
        {qrData && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Results</h2>
              <div className="flex items-center gap-2">
                <Badge variant={qrData.error ? "danger" : qrData.type === "pass" ? "success" : "secondary"}>
                  {qrData.type === "pass" ? "Pass Token" : qrData.type === "registration_url" ? "Registration URL" : "Unknown"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(qrData.raw)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {qrData.error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Error</p>
                  <p className="text-sm text-red-400/80">{qrData.error}</p>
                </div>
              </div>
            )}

            {/* Raw Content */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-secondary uppercase tracking-wider">Raw Content</p>
              <div className="p-3 rounded-lg bg-glass border border-border">
                <code className="text-xs text-primary break-all">{qrData.raw}</code>
              </div>
            </div>

            {/* Decoded JWT Payload */}
            {qrData.decoded && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider">Decoded Payload</p>
                <div className="p-3 rounded-lg bg-glass border border-border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Registration ID:</span>
                    <code className="text-primary font-mono">{qrData.decoded.registration_id}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Event ID:</span>
                    <code className="text-primary font-mono">{qrData.decoded.event_id}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Attendee ID:</span>
                    <code className="text-primary font-mono">{qrData.decoded.attendee_id}</code>
                  </div>
                  {qrData.decoded.exp && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Expires:</span>
                      <span className="text-primary">{new Date(qrData.decoded.exp * 1000).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attendee Info */}
            {qrData.attendee && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> Attendee
                </p>
                <div className="p-3 rounded-lg bg-glass border border-border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Name:</span>
                    <span className="text-primary font-medium">{qrData.attendee.name}</span>
                  </div>
                  {qrData.attendee.email && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Email:</span>
                      <span className="text-primary">{qrData.attendee.email}</span>
                    </div>
                  )}
                  {qrData.attendee.phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Phone:</span>
                      <span className="text-primary">{qrData.attendee.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">ID:</span>
                    <code className="text-primary font-mono text-xs">{qrData.attendee.id}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Event Info */}
            {qrData.event && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Event
                </p>
                <div className="p-3 rounded-lg bg-glass border border-border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Name:</span>
                    <span className="text-primary font-medium">{qrData.event.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Date:</span>
                    <span className="text-primary">{formatDate(qrData.event.start_time)}</span>
                  </div>
                  {qrData.event.venue && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Venue:</span>
                      <span className="text-primary flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {qrData.event.venue.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Slug:</span>
                    <code className="text-primary font-mono">{qrData.event.slug}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Registration Info */}
            {qrData.registration && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Ticket className="h-3 w-3" /> Registration
                </p>
                <div className="p-3 rounded-lg bg-glass border border-border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Status:</span>
                    <Badge variant={qrData.registration.checked_in ? "success" : "secondary"}>
                      {qrData.registration.checked_in ? "Checked In" : qrData.registration.status}
                    </Badge>
                  </div>
                  {qrData.registration.registered_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Registered:</span>
                      <span className="text-primary">{formatDate(qrData.registration.registered_at)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">ID:</span>
                    <code className="text-primary font-mono text-xs">{qrData.registration.id}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Referrer Info - Made prominent as this is the key info */}
            {qrData.referrer && (qrData.referrer.type || qrData.referrer.id || qrData.referrer.code) && (
              <div className="space-y-2 border-2 border-accent-secondary rounded-xl p-4 bg-accent-secondary/5">
                <p className="text-sm font-bold text-accent-secondary uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" /> REFERRER ATTRIBUTION
                </p>
                
                {/* Big name display */}
                {qrData.referrer.name ? (
                  <div className="text-center py-3 bg-accent-secondary/10 rounded-lg">
                    <p className="text-2xl font-bold text-accent-secondary">{qrData.referrer.name}</p>
                    <p className="text-xs text-secondary mt-1 capitalize">{qrData.referrer.type || "Unknown"}</p>
                  </div>
                ) : (
                  <div className="text-center py-3 bg-warning/10 rounded-lg border border-warning/30">
                    <p className="text-lg font-bold text-warning">No name found</p>
                    <p className="text-xs text-secondary mt-1">Referrer ID: {qrData.referrer.id || qrData.referrer.code || "Unknown"}</p>
                  </div>
                )}

                <div className="space-y-1 pt-2 border-t border-border/50">
                  {qrData.referrer.type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Type:</span>
                      <Badge variant="default" className="capitalize">{qrData.referrer.type}</Badge>
                    </div>
                  )}
                  {qrData.referrer.code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Invite Code:</span>
                      <code className="text-primary font-mono">{qrData.referrer.code}</code>
                    </div>
                  )}
                  {qrData.referrer.id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Referrer ID:</span>
                      <code className="text-primary font-mono text-xs">{qrData.referrer.id}</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No Referrer Warning */}
            {qrData.type === "registration_url" && (!qrData.referrer || (!qrData.referrer.type && !qrData.referrer.id && !qrData.referrer.code)) && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-warning">No Referrer Detected</p>
                  <p className="text-xs text-secondary">This registration URL has no referral attribution</p>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="pt-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleQRCode(qrData.raw)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-4 bg-glass/50">
          <h3 className="text-sm font-medium text-primary mb-2">Supported QR Code Types</h3>
          <ul className="text-xs text-secondary space-y-1">
            <li>• <strong>Pass Tokens:</strong> JWT tokens from event passes (shows attendee, event, check-in status)</li>
            <li>• <strong>Registration URLs:</strong> URLs like /e/event-slug/register?ref=promoter_123</li>
            <li>• <strong>Invite Codes:</strong> Short codes used for promoter referrals</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

