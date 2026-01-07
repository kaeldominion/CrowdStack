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
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Use device pixel ratio for high-DPI displays (2x for retina, 3x for high-res)
        const dpr = Math.min(window.devicePixelRatio || 2, 3);
        const displaySize = size;
        const actualSize = displaySize * dpr;

        // Set canvas size accounting for device pixel ratio
        canvas.width = actualSize;
        canvas.height = actualSize;
        canvas.style.width = `${displaySize}px`;
        canvas.style.height = `${displaySize}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Scale context to account for device pixel ratio
        ctx.scale(dpr, dpr);

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Create temporary canvas for QR code generation
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = displaySize;
        tempCanvas.height = displaySize;
        
        // Generate QR code to temporary canvas
        await QRCode.toCanvas(tempCanvas, url, {
          width: displaySize,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          errorCorrectionLevel: "H", // High error correction for logo overlay
        });

        // Draw QR code to main canvas (will be scaled by dpr for sharpness)
        ctx.drawImage(tempCanvas, 0, 0, displaySize, displaySize);

        // Load and draw logo from PNG file
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        
        logo.onload = () => {
          // Calculate center position (in display coordinates, ctx is already scaled)
          const centerX = displaySize / 2;
          const centerY = displaySize / 2;
          const logoX = centerX - logoSize / 2;
          const logoY = centerY - logoSize / 2;
          const padding = 4;
          const borderRadius = 8; // Rounded corners

          // Draw black background square with rounded corners for logo
          ctx.fillStyle = "#000000";
          ctx.beginPath();
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

          // Draw logo at high resolution (will be scaled by dpr for sharpness)
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        };

        logo.onerror = () => {
          console.warn("Failed to load logo for QR code");
          // Continue without logo if it fails to load
        };

        // Use the PNG file directly - load at natural size for best quality
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
        className="rounded-lg"
        style={{ 
          imageRendering: "auto", // Changed from "pixelated" to "auto" for better quality
          maxWidth: "100%",
          height: "auto"
        }}
      />
    </div>
  );
}

