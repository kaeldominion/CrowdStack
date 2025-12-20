"use client";

import { useEffect, useState } from "react";
import { Button } from "@crowdstack/ui";
import { QrCode, Ticket } from "lucide-react";
import Link from "next/link";

interface EventQRCodeProps {
  eventSlug: string;
}

export function EventQRCode({ eventSlug }: EventQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const response = await fetch(`/api/events/by-slug/${eventSlug}/check-registration`);
        if (response.ok) {
          const data = await response.json();
          if (data.registered && data.qr_pass_token) {
            setRegistered(true);
            setQrToken(data.qr_pass_token);
            // Generate QR code URL using qrserver.com API
            const qrData = encodeURIComponent(data.qr_pass_token);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=ffffff&color=000000&margin=10`;
            setQrCodeUrl(qrUrl);
          }
        }
      } catch (error) {
        console.error("Failed to check registration:", error);
      } finally {
        setLoading(false);
      }
    };

    checkRegistration();
  }, [eventSlug]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!registered) {
    return (
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-foreground-muted text-center mb-3">
          Register to get your QR pass
        </p>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-border space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-center gap-2">
          <Ticket className="h-4 w-4" />
          Your Event Pass
        </h3>
        {qrCodeUrl && (
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-white p-3 rounded-lg border-2 border-border">
              <img 
                src={qrCodeUrl} 
                alt="Event QR Pass" 
                className="w-40 h-40"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <p className="text-xs text-foreground-muted text-center">
              Show this QR code at the event entrance
            </p>
            {qrToken && (
              <Link href={`/e/${eventSlug}/pass?token=${encodeURIComponent(qrToken)}`}>
                <Button variant="secondary" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  View Full Pass
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

