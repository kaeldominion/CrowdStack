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

        // Draw logo using SVG directly for crisp rendering
        const drawLogo = () => {
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

          // Create SVG logo and render to canvas
          // Tricolor logo: white (top), purple (middle), blue (bottom)
          const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${logoSize}" height="${logoSize}">
              <defs>
                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#A855F7"/>
                  <stop offset="100%" stop-color="#C084FC"/>
                </linearGradient>
                <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#3B82F6"/>
                  <stop offset="100%" stop-color="#60A5FA"/>
                </linearGradient>
              </defs>
              <!-- Top layer (white) -->
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Middle layer (purple) -->
              <path d="M2 12L12 17L22 12" stroke="url(#purpleGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <!-- Bottom layer (blue) -->
              <path d="M12 17L2 22L12 24L22 22L12 17Z" fill="url(#blueGrad)" stroke="url(#blueGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;

          // Convert SVG to image and draw
          const img = new Image();
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          
          img.onload = () => {
            // Draw SVG at high resolution
            ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
            URL.revokeObjectURL(url);
          };
          
          img.onerror = () => {
            // Fallback to PNG if SVG fails
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = "anonymous";
            fallbackImg.onload = () => {
              ctx.drawImage(fallbackImg, logoX, logoY, logoSize, logoSize);
            };
            fallbackImg.src = "/logos/crowdstack-icon-tricolor-on-transparent.png";
            URL.revokeObjectURL(url);
          };
          
          img.src = url;
        };

        // Draw logo
        drawLogo();
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

