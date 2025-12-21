"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Card, Container, Section, Button, Logo } from "@crowdstack/ui";
import { ArrowLeft, Download, Check, Copy } from "lucide-react";

type LogoVariant = "full" | "icon" | "wordmark";
type LogoSize = "sm" | "md" | "lg" | "xl";
type ColorScheme = "light" | "dark" | "blue";

interface LogoOption {
  variant: LogoVariant;
  size: LogoSize;
  colorScheme: ColorScheme;
  label: string;
}

const logoVariants: { value: LogoVariant; label: string; description: string }[] = [
  { value: "full", label: "Full Logo", description: "Icon + Wordmark" },
  { value: "icon", label: "Icon Only", description: "Stacked bars icon" },
  { value: "wordmark", label: "Wordmark Only", description: "Text only" },
];

const logoSizes: { value: LogoSize; label: string; px: number }[] = [
  { value: "sm", label: "Small", px: 24 },
  { value: "md", label: "Medium", px: 32 },
  { value: "lg", label: "Large", px: 48 },
  { value: "xl", label: "Extra Large", px: 64 },
];

const colorSchemes: { value: ColorScheme; label: string; bg: string; text: string }[] = [
  { value: "dark", label: "Dark (White Logo)", bg: "#0B0D10", text: "text-white" },
  { value: "light", label: "Light (Dark Logo)", bg: "#FFFFFF", text: "text-gray-900" },
  { value: "blue", label: "Blue Accent", bg: "#0B0D10", text: "text-[#3B82F6]" },
];

// Brand colors for reference
const brandColors = [
  { name: "Primary Blue", hex: "#3B82F6", rgb: "59, 130, 246" },
  { name: "Background Dark", hex: "#0B0D10", rgb: "11, 13, 16" },
  { name: "Surface", hex: "#1A1D24", rgb: "26, 29, 36" },
  { name: "Border", hex: "#2A2F3A", rgb: "42, 47, 58" },
  { name: "Text Primary", hex: "#FFFFFF", rgb: "255, 255, 255" },
  { name: "Text Muted", hex: "#9CA3AF", rgb: "156, 163, 175" },
];

export default function BrandAssetsPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const svgRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const copyToClipboard = (text: string, colorName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const downloadSVG = (variant: LogoVariant, colorScheme: ColorScheme) => {
    const key = `${variant}-${colorScheme}`;
    const container = svgRefs.current[key];
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Clone the SVG and set proper attributes
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    
    // Set explicit dimensions
    const sizeMap = { sm: 24, md: 32, lg: 48, xl: 64 };
    clonedSvg.setAttribute("width", "64");
    clonedSvg.setAttribute("height", "64");
    
    // Set the color based on scheme
    const color = colorScheme === "light" ? "#1F2937" : colorScheme === "blue" ? "#3B82F6" : "#FFFFFF";
    clonedSvg.style.color = color;
    
    // Convert to blob and download
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `crowdstack-logo-${variant}-${colorScheme}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const downloadPNG = async (variant: LogoVariant, colorScheme: ColorScheme, scale: number = 4) => {
    const key = `${variant}-${colorScheme}`;
    const container = svgRefs.current[key];
    if (!container) return;

    const svg = container.querySelector("svg");
    if (!svg) return;

    // Clone and prepare SVG
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    const color = colorScheme === "light" ? "#1F2937" : colorScheme === "blue" ? "#3B82F6" : "#FFFFFF";
    
    // Get original dimensions
    const bbox = svg.getBoundingClientRect();
    const width = bbox.width * scale;
    const height = bbox.height * scale;
    
    clonedSvg.setAttribute("width", String(width));
    clonedSvg.setAttribute("height", String(height));
    clonedSvg.style.color = color;
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    
    // Create canvas and draw
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // For transparent background, don't fill
    // For dark/blue schemes, we might want transparent
    // For light scheme, we might want white background
    if (colorScheme === "light") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
    }
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      
      // Download
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `crowdstack-logo-${variant}-${colorScheme}-${scale}x.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = svgDataUrl;
  };

  const downloadAllAssets = () => {
    // Download all combinations
    const variants: LogoVariant[] = ["full", "icon", "wordmark"];
    const schemes: ColorScheme[] = ["dark", "light", "blue"];
    
    variants.forEach((variant) => {
      schemes.forEach((scheme) => {
        setTimeout(() => {
          downloadSVG(variant, scheme);
        }, 100);
      });
    });
  };

  return (
    <Section spacing="lg">
      <Container>
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">Brand Assets</h1>
          <p className="text-sm text-foreground-muted">
            Download CrowdStack logos and brand materials in various formats
          </p>
        </div>

        {/* Quick Download */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Quick Download</h2>
              <p className="text-sm text-foreground-muted">Download all logo variations at once</p>
            </div>
            <Button onClick={downloadAllAssets}>
              <Download className="h-4 w-4 mr-2" />
              Download All SVGs
            </Button>
          </div>
        </Card>

        {/* Logo Variations */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Logo Variations</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {logoVariants.map((logoVar) => (
              <Card key={logoVar.value} className="overflow-hidden">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">{logoVar.label}</h3>
                  <p className="text-xs text-foreground-muted">{logoVar.description}</p>
                </div>
                
                {/* Preview for each color scheme */}
                <div className="space-y-3">
                  {colorSchemes.map((scheme) => (
                    <div key={scheme.value} className="rounded-lg overflow-hidden">
                      <div
                        className="p-6 flex items-center justify-center"
                        style={{ backgroundColor: scheme.bg }}
                        ref={(el) => {
                          svgRefs.current[`${logoVar.value}-${scheme.value}`] = el;
                        }}
                      >
                        <Logo
                          variant={logoVar.value}
                          size="lg"
                          animated={false}
                          className={scheme.text}
                        />
                      </div>
                      <div className="flex gap-2 p-2 bg-surface-elevated">
                        <button
                          onClick={() => downloadSVG(logoVar.value, scheme.value)}
                          className="flex-1 text-xs px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
                        >
                          SVG
                        </button>
                        <button
                          onClick={() => downloadPNG(logoVar.value, scheme.value, 2)}
                          className="flex-1 text-xs px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
                        >
                          PNG 2x
                        </button>
                        <button
                          onClick={() => downloadPNG(logoVar.value, scheme.value, 4)}
                          className="flex-1 text-xs px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
                        >
                          PNG 4x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Brand Colors */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Brand Colors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {brandColors.map((color) => (
              <Card key={color.name} className="p-0 overflow-hidden">
                <div
                  className="h-20 w-full"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="p-3">
                  <p className="text-xs font-medium text-foreground mb-1">{color.name}</p>
                  <button
                    onClick={() => copyToClipboard(color.hex, color.name)}
                    className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
                  >
                    {copiedColor === color.name ? (
                      <>
                        <Check className="h-3 w-3 text-success" />
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

        {/* Usage Guidelines */}
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">Usage Guidelines</h2>
          <div className="space-y-4 text-sm text-foreground-muted">
            <div>
              <h3 className="font-medium text-foreground mb-1">Clear Space</h3>
              <p>Maintain clear space around the logo equal to the height of the "C" in CrowdStack.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Minimum Size</h3>
              <p>The full logo should not be smaller than 100px wide. The icon should not be smaller than 24px.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Color Usage</h3>
              <p>Use the white logo on dark backgrounds, the dark logo on light backgrounds. The blue accent version is for special applications.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Don't</h3>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Stretch or distort the logo</li>
                <li>Add effects like shadows or gradients</li>
                <li>Change the logo colors outside of the provided schemes</li>
                <li>Place the logo on busy or low-contrast backgrounds</li>
              </ul>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
}

