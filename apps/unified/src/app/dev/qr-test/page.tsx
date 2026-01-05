"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Card, Badge, InlineSpinner } from "@crowdstack/ui";
import { Camera, Copy, Check, RefreshCw, QrCode, User, Calendar, MapPin, Users, Ticket, AlertCircle } from "lucide-react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setScanning(true);
      scanFrame();
    } catch (error) {
      console.error("Failed to start camera:", error);
      alert("Failed to access camera. Please ensure camera permissions are granted.");
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Use BarcodeDetector if available (modern browsers)
      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        barcodeDetector.detect(imageData)
          .then((barcodes: any[]) => {
            if (barcodes.length > 0) {
              handleQRCode(barcodes[0].rawValue);
              stopScanning();
            } else {
              requestAnimationFrame(scanFrame);
            }
          })
          .catch(() => {
            requestAnimationFrame(scanFrame);
          });
      } else {
        // Fallback: just keep trying (user should use manual input)
        requestAnimationFrame(scanFrame);
      }
    } else {
      requestAnimationFrame(scanFrame);
    }
  };

  const handleQRCode = async (code: string) => {
    setLoading(true);
    setQrData(null);

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

          {scanning && (
            <div className="relative aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-accent-secondary/50 rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-accent-secondary rounded-lg" />
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

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
                <Badge variant={qrData.error ? "destructive" : qrData.type === "pass" ? "success" : "secondary"}>
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

            {/* Referrer Info */}
            {qrData.referrer && qrData.referrer.type && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-secondary uppercase tracking-wider flex items-center gap-1">
                  <Users className="h-3 w-3" /> Referrer
                </p>
                <div className="p-3 rounded-lg bg-accent-secondary/10 border border-accent-secondary/20 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Type:</span>
                    <Badge variant="default" className="capitalize">{qrData.referrer.type}</Badge>
                  </div>
                  {qrData.referrer.name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Name:</span>
                      <span className="text-accent-secondary font-medium">{qrData.referrer.name}</span>
                    </div>
                  )}
                  {qrData.referrer.code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Code:</span>
                      <code className="text-primary font-mono">{qrData.referrer.code}</code>
                    </div>
                  )}
                  {qrData.referrer.id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">ID:</span>
                      <code className="text-primary font-mono text-xs">{qrData.referrer.id}</code>
                    </div>
                  )}
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

