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
          const padding = 4;
          const borderRadius = 8; // Rounded corners

          // Draw black background square with rounded corners for logo
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          // Use manual rounded rect since roundRect might not be available
          const x = logoX - padding;
          const y = logoY - padding;
          const w = logoSize + (padding * 2);
          const h = logoSize + (padding * 2);
          ctx.moveTo(x + borderRadius, y);
          ctx.lineTo(x + w - borderRadius, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + borderRadius);
          ctx.lineTo(x + w, y + h - borderRadius);
          ctx.quadraticCurveTo(x + w, y + h, x + w - borderRadius, y + h);
          ctx.lineTo(x + borderRadius, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - borderRadius);
          ctx.lineTo(x, y + borderRadius);
          ctx.quadraticCurveTo(x, y, x + borderRadius, y);
          ctx.closePath();
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

