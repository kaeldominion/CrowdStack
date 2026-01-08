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
        // Guard against window not being available (shouldn't happen in client component, but safety first)
        const dpr = typeof window !== "undefined" 
          ? Math.min(window.devicePixelRatio || 2, 3)
          : 2;
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
        try {
          await QRCode.toCanvas(tempCanvas, url, {
            width: displaySize,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            errorCorrectionLevel: "H", // High error correction for logo overlay
          });
        } catch (qrError: any) {
          console.error("QR code generation failed:", qrError);
          throw new Error(`Failed to generate QR code: ${qrError.message || "Unknown error"}`);
        }

        // Draw QR code to main canvas (will be scaled by dpr for sharpness)
        ctx.drawImage(tempCanvas, 0, 0, displaySize, displaySize);

        // Load and draw logo from PNG file
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        
        logo.onload = () => {
          try {
            // Calculate center position (in display coordinates, ctx is already scaled)
            const centerX = displaySize / 2;
            const centerY = displaySize / 2;
            const logoX = centerX - logoSize / 2;
            const logoY = centerY - logoSize / 2;
            const padding = 4;

            // Draw black background square with square edges for logo
            ctx.fillStyle = "#000000";
            const x = logoX - padding;
            const y = logoY - padding;
            const w = logoSize + (padding * 2);
            const h = logoSize + (padding * 2);
            ctx.fillRect(x, y, w, h);

            // Draw logo at high resolution (will be scaled by dpr for sharpness)
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          } catch (drawError) {
            console.warn("Failed to draw logo on QR code:", drawError);
            // Continue without logo if drawing fails
          }
        };

        logo.onerror = (error) => {
          console.warn("Failed to load logo for QR code:", error);
          // Continue without logo if it fails to load
        };

        // Use the PNG file directly - load at natural size for best quality
        // Wrap in try-catch to handle any load errors gracefully
        try {
          logo.src = "/logos/crowdstack-icon-tricolor-on-transparent.png";
        } catch (loadError) {
          console.warn("Failed to set logo source:", loadError);
          // Continue without logo
        }
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

