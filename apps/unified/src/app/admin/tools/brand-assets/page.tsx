"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Badge } from "@crowdstack/ui";
import { ArrowLeft, Download, Check, Copy, Image as ImageIcon } from "lucide-react";

type LogoColor = "white" | "purple" | "black" | "tricolor" | "tricolor-inverted";
type BackgroundType = "black" | "white" | "transparent";
type WordmarkTheme = "dark" | "light";
type WordmarkVariant = "standard" | "mono";

// The CrowdStack Logo Component - matches the new brand
const CrowdStackLogo = ({ 
  className, 
  color = "white" 
}: { 
  className?: string; 
  color?: LogoColor;
}) => {
  let s1 = "currentColor"; // Top
  let s2 = "currentColor"; // Middle
  let s3 = "currentColor"; // Bottom

  if (color === "purple") {
    s1 = s2 = s3 = "#A855F7";
  } else if (color === "black") {
    s1 = s2 = s3 = "#000000";
  } else if (color === "white") {
    s1 = s2 = s3 = "#FFFFFF";
  } else if (color === "tricolor") {
    s1 = "#FFFFFF"; // Top - White
    s2 = "#A855F7"; // Middle - Purple
    s3 = "#3B82F6"; // Bottom - Blue
  } else if (color === "tricolor-inverted") {
    s1 = "#000000"; // Top - Black
    s2 = "#A855F7"; // Middle - Purple
    s3 = "#3B82F6"; // Bottom - Blue
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        fill="none"
        stroke={s1}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        fill="none"
        stroke={s3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        fill="none"
        stroke={s2}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Brand colors for reference
const brandColors = [
  { name: "Primary Purple", hex: "#A855F7", rgb: "168, 85, 247" },
  { name: "Primary Blue", hex: "#3B82F6", rgb: "59, 130, 246" },
  { name: "Background Void", hex: "#0A0A0A", rgb: "10, 10, 10" },
  { name: "Surface", hex: "#111111", rgb: "17, 17, 17" },
  { name: "Text Primary", hex: "#FFFFFF", rgb: "255, 255, 255" },
  { name: "Text Muted", hex: "#64748B", rgb: "100, 116, 139" },
];

export default function BrandAssetsPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const copyToClipboard = (text: string, colorName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Helper function to generate and download PNG for Icons
  const downloadLogo = (
    colorName: LogoColor,
    bg: BackgroundType
  ) => {
    const width = 1024;
    const height = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Fill background if not transparent
    if (bg === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
    } else if (bg === "white") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }

    // Determine stroke color hex values for SVG paths
    let s1 = "#FFFFFF";
    let s2 = "#FFFFFF";
    let s3 = "#FFFFFF";

    if (colorName === "tricolor" || colorName === "tricolor-inverted") {
      s1 = colorName === "tricolor" ? "#FFFFFF" : "#000000"; // Top
      s2 = "#A855F7"; // Middle - Purple
      s3 = "#3B82F6"; // Bottom - Blue
    } else {
      let hex = "#FFFFFF";
      if (colorName === "purple") hex = "#A855F7";
      if (colorName === "black") hex = "#000000";
      s1 = s2 = s3 = hex;
    }

    // Create SVG string
    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" width="${width}" height="${height}">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="none" stroke="${s1}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M2 17L12 22L22 17" fill="none" stroke="${s3}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M2 12L12 17L22 12" fill="none" stroke="${s2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;

    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");

      // Trigger download
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `crowdstack-icon-${colorName}-on-${bg}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Helper function to generate and download PNG for Full Wordmark
  const downloadFullLogo = (
    theme: WordmarkTheme,
    variant: WordmarkVariant,
    transparent: boolean = false
  ) => {
    const width = 1600;
    const height = 300;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    if (!transparent) {
      ctx.fillStyle = theme === "dark" ? "#000000" : "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }

    // Colors
    const textColor = theme === "dark" ? "#FFFFFF" : "#000000";
    const dotColor = variant === "standard" ? "#A855F7" : textColor;

    let s1: string, s2: string, s3: string;
    if (variant === "mono") {
      s1 = s2 = s3 = textColor;
    } else {
      // Standard
      s1 = theme === "dark" ? "#FFFFFF" : "#000000";
      s2 = "#A855F7";
      s3 = "#3B82F6";
    }

    // SVG construction
    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 60" width="${width}" height="${height}">
        <style>
            .text { font-family: system-ui, -apple-system, sans-serif; font-weight: 900; font-size: 28px; letter-spacing: -1px; }
        </style>
        <g transform="translate(20, 8) scale(1.8)">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="none" stroke="${s1}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M2 17L12 22L22 17" fill="none" stroke="${s3}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M2 12L12 17L22 12" fill="none" stroke="${s2}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <text x="76" y="40" class="text" fill="${textColor}">CROWDSTACK<tspan fill="${dotColor}">.</tspan></text>
    </svg>`;

    const img = new Image();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `crowdstack-wordmark-${theme}-${variant}${transparent ? "-transparent" : ""}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Checkered pattern for transparent previews
  const CheckeredBg = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />
      <div className="relative z-10 flex items-center justify-center h-full">
        {children}
      </div>
    </div>
  );

  return (
    <Section spacing="lg">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <ImageIcon className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Brand Assets</h1>
          </div>
          <p className="text-sm text-secondary max-w-lg">
            Official CrowdStack brand resources. Export high-resolution PNG
            variations for marketing materials, event flyers, and digital
            platforms.
          </p>
        </div>

        {/* Primary Icons */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 pb-4 border-b border-border-subtle">
            Primary Icons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* White on Black */}
            <Card className="!p-6">
              <div className="w-full aspect-square bg-black rounded-xl border border-border-subtle flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20" />
                <CrowdStackLogo color="white" className="w-24 h-24 relative z-10" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">White</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Black BG</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadLogo("white", "black")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Purple on Black */}
            <Card className="!p-6">
              <div className="w-full aspect-square bg-black rounded-xl border border-border-subtle flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20" />
                <CrowdStackLogo color="purple" className="w-24 h-24 relative z-10" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Purple</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Black BG</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="!bg-purple-600 hover:!bg-purple-500"
                  onClick={() => downloadLogo("purple", "black")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Tri-Color on Black */}
            <Card className="!p-6">
              <div className="w-full aspect-square bg-black rounded-xl border border-border-subtle flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20" />
                <CrowdStackLogo color="tricolor" className="w-24 h-24 relative z-10" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Tri-Color</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Icon</p>
                </div>
                <Button
                  size="sm"
                  className="!bg-gradient-to-r !from-purple-500 !to-blue-500"
                  onClick={() => downloadLogo("tricolor", "black")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Black on White */}
            <Card className="!p-6">
              <div className="w-full aspect-square bg-white rounded-xl border border-border-subtle flex items-center justify-center mb-4">
                <CrowdStackLogo color="black" className="w-24 h-24" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Black</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">White BG</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadLogo("black", "white")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Transparent Icons */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 pb-4 border-b border-border-subtle">
            Transparent Icons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* White Transparent */}
            <Card className="!p-6">
              <CheckeredBg className="w-full aspect-square rounded-xl border border-border-subtle mb-4 bg-[#1a1a1a]">
                <CrowdStackLogo color="white" className="w-24 h-24" />
              </CheckeredBg>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">White</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Transparent</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadLogo("white", "transparent")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Purple Transparent */}
            <Card className="!p-6">
              <CheckeredBg className="w-full aspect-square rounded-xl border border-border-subtle mb-4 bg-[#1a1a1a]">
                <CrowdStackLogo color="purple" className="w-24 h-24" />
              </CheckeredBg>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Purple</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Transparent</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="!bg-purple-600 hover:!bg-purple-500"
                  onClick={() => downloadLogo("purple", "transparent")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Tri-Color Transparent */}
            <Card className="!p-6">
              <CheckeredBg className="w-full aspect-square rounded-xl border border-border-subtle mb-4 bg-[#1a1a1a]">
                <CrowdStackLogo color="tricolor" className="w-24 h-24" />
              </CheckeredBg>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Tri-Color</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Transparent</p>
                </div>
                <Button
                  size="sm"
                  className="!bg-gradient-to-r !from-purple-500 !to-blue-500"
                  onClick={() => downloadLogo("tricolor", "transparent")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Black Transparent */}
            <Card className="!p-6">
              <CheckeredBg className="w-full aspect-square rounded-xl border border-border-subtle mb-4 bg-slate-200">
                <CrowdStackLogo color="black" className="w-24 h-24" />
              </CheckeredBg>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-primary font-bold">Black</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">Transparent</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadLogo("black", "transparent")}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Full Wordmarks */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 pb-4 border-b border-border-subtle">
            Full Wordmarks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark Standard */}
            <Card className="!p-6">
              <div className="w-full aspect-[3/1] bg-black rounded-xl border border-border-subtle flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20" />
                <div className="flex items-center gap-3 relative z-10">
                  <CrowdStackLogo color="tricolor" className="w-10 h-10" />
                  <span className="font-black text-xl text-white tracking-tighter">
                    CROWDSTACK<span className="text-purple-500">.</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary font-bold">Dark Standard</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">
                    Tri-Color Icon + Purple Dot
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadFullLogo("dark", "standard", false)}
                  >
                    BG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadFullLogo("dark", "standard", true)}
                  >
                    Transparent
                  </Button>
                </div>
              </div>
            </Card>

            {/* Dark Mono */}
            <Card className="!p-6">
              <div className="w-full aspect-[3/1] bg-black rounded-xl border border-border-subtle flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20" />
                <div className="flex items-center gap-3 relative z-10">
                  <CrowdStackLogo color="white" className="w-10 h-10" />
                  <span className="font-black text-xl text-white tracking-tighter">
                    CROWDSTACK.
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary font-bold">Dark Mono</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">
                    All White
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadFullLogo("dark", "mono", false)}
                  >
                    BG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadFullLogo("dark", "mono", true)}
                  >
                    Transparent
                  </Button>
                </div>
              </div>
            </Card>

            {/* Light Standard */}
            <Card className="!p-6">
              <div className="w-full aspect-[3/1] bg-white rounded-xl border border-border-subtle flex items-center justify-center mb-4">
                <div className="flex items-center gap-3">
                  <CrowdStackLogo color="tricolor-inverted" className="w-10 h-10" />
                  <span className="font-black text-xl text-black tracking-tighter">
                    CROWDSTACK<span className="text-purple-500">.</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary font-bold">Light Standard</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">
                    Tri-Color Icon + Purple Dot
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadFullLogo("light", "standard", false)}
                  >
                    BG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadFullLogo("light", "standard", true)}
                  >
                    Transparent
                  </Button>
                </div>
              </div>
            </Card>

            {/* Light Mono */}
            <Card className="!p-6">
              <div className="w-full aspect-[3/1] bg-white rounded-xl border border-border-subtle flex items-center justify-center mb-4">
                <div className="flex items-center gap-3">
                  <CrowdStackLogo color="black" className="w-10 h-10" />
                  <span className="font-black text-xl text-black tracking-tighter">
                    CROWDSTACK.
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-primary font-bold">Light Mono</h3>
                  <p className="text-[10px] text-secondary uppercase tracking-widest">
                    All Black
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => downloadFullLogo("light", "mono", false)}
                  >
                    BG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadFullLogo("light", "mono", true)}
                  >
                    Transparent
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 pb-4 border-b border-border-subtle">
            Brand Colors
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {brandColors.map((color) => (
              <Card key={color.name} className="!p-0 overflow-hidden">
                <div className="h-20 w-full" style={{ backgroundColor: color.hex }} />
                <div className="p-3">
                  <p className="text-xs font-medium text-primary mb-1">{color.name}</p>
                  <button
                    onClick={() => copyToClipboard(color.hex, color.name)}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
                  >
                    {copiedColor === color.name ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{color.hex}</span>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-secondary uppercase tracking-widest mb-6 pb-4 border-b border-border-subtle">
            Typography
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="!p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-primary font-bold">Sans Serif</h4>
                <Badge>Default</Badge>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-5xl font-black text-primary mb-2">Aa</div>
                  <div className="text-xs font-mono text-secondary">
                    Inter / System Sans
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-primary">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                  <p className="text-lg font-bold text-primary">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                  <p className="text-base text-secondary">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="!p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-primary font-bold">Monospace</h4>
                <Badge variant="secondary">Data / UI</Badge>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-5xl font-black text-primary mb-2 font-mono">
                    Aa
                  </div>
                  <div className="text-xs font-mono text-secondary">
                    JetBrains Mono / System Mono
                  </div>
                </div>
                <div className="space-y-2 font-mono">
                  <p className="text-xl font-bold text-primary">
                    console.log(&quot;Hello World&quot;);
                  </p>
                  <p className="text-lg text-purple-400">ID: 8X29-B4K2</p>
                  <p className="text-sm text-secondary">
                    01001000 01100101 01101100 01101100 01101111
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Usage Guidelines */}
        <Card>
          <h2 className="text-lg font-semibold text-primary mb-4">
            Usage Guidelines
          </h2>
          <div className="space-y-4 text-sm text-secondary">
            <div>
              <h3 className="font-medium text-primary mb-1">Clear Space</h3>
              <p>
                Maintain clear space around the logo equal to the height of the
                icon layers.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Minimum Size</h3>
              <p>
                The full logo should not be smaller than 100px wide. The icon
                should not be smaller than 24px.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Color Usage</h3>
              <p>
                Use the white/tricolor logo on dark backgrounds, the
                black/tricolor-inverted logo on light backgrounds. Purple is for
                accent applications.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Don&apos;t</h3>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Stretch or distort the logo</li>
                <li>Add effects like shadows or additional gradients</li>
                <li>Change the logo colors outside of the provided schemes</li>
                <li>Place the logo on busy or low-contrast backgrounds</li>
                <li>Rotate the logo or individual layers</li>
              </ul>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
