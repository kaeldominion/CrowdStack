"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface BeautifiedQRCodeProps {
  url: string;
  size?: number;
  className?: string;
  logoSize?: number;
}

/**
 * Beautified QR code component with CrowdStack logo in the center
 */
export function BeautifiedQRCode({
  url,
  size = 300,
  className = "",
  logoSize = 60,
}: BeautifiedQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    const generateQR = async () => {
      try {
        setError(null);
        
        // Generate QR code
        await QRCode.toCanvas(canvasRef.current, url, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H", // High error correction for logo overlay
        });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Load and draw logo in center
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        
        logo.onload = () => {
          // Calculate center position
          const centerX = size / 2;
          const centerY = size / 2;
          const logoX = centerX - logoSize / 2;
          const logoY = centerY - logoSize / 2;

          // Draw white background circle for logo
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(centerX, centerY, logoSize / 2 + 4, 0, 2 * Math.PI);
          ctx.fill();

          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        };

        logo.onerror = () => {
          console.warn("Failed to load logo for QR code");
          // Continue without logo if it fails to load
        };

        // Use the tricolor icon logo
        logo.src = "/logos/crowdstack-icon-tricolor-on-transparent.png";
      } catch (err: any) {
        console.error("Error generating QR code:", err);
        setError(err.message || "Failed to generate QR code");
      }
    };

    generateQR();
  }, [url, size, logoSize]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <div className="text-sm text-secondary text-center">
          <p>Failed to generate QR code</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}

