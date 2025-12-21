"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";

interface EventQRCodeProps {
  eventSlug: string;
}

export function EventQRCode({ eventSlug }: EventQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPromotionQR = async () => {
      try {
        const response = await fetch(`/api/events/by-slug/${eventSlug}/promotion-qr`);
        if (response.ok) {
          const data = await response.json();
          if (data.qr_url) {
            setRegistrationUrl(data.qr_url);
            // Generate QR code image URL using qrserver.com API
            const qrData = encodeURIComponent(data.qr_url);
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
            setQrCodeUrl(qrImageUrl);
          }
        }
      } catch (error) {
        console.error("Failed to load promotion QR:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotionQR();
  }, [eventSlug]);

  if (loading) {
    return (
      <div className="pt-4 border-t border-border">
        <div className="text-center text-foreground-muted text-sm">
          Loading QR code...
        </div>
      </div>
    );
  }

  if (!qrCodeUrl || !registrationUrl) {
    return null;
  }

  return (
    <div className="hidden md:block pt-4 border-t border-border space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
          <QrCode className="h-4 w-4" />
          Promotion QR Code
        </h3>
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-white p-4 rounded-lg border-2 border-border shadow-lg">
            <img 
              src={qrCodeUrl} 
              alt="Event Promotion QR Code" 
              className="w-48 h-48"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-foreground-muted text-center max-w-sm">
              Scan this QR code to register for the event. Registrations will be attributed to the event organizer.
            </p>
            <p className="text-xs text-foreground-muted text-center italic">
              Save this QR code to share with others
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

