"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Container, Section, Button } from "@crowdstack/ui";
import { ArrowLeft, Download, Check, Copy } from "lucide-react";

type LogoVariant = "full" | "icon" | "wordmark";
type ColorScheme = "light" | "dark" | "blue";

interface ColorConfig {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  label: string;
}

const colorSchemes: Record<ColorScheme, ColorConfig> = {
  dark: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.8)",
    accent: "#3B82F6",
    bg: "#0B0D10",
    label: "Dark (White Logo)",
  },
  light: {
    primary: "#1F2937",
    secondary: "rgba(31, 41, 55, 0.8)",
    accent: "#3B82F6",
    bg: "#FFFFFF",
    label: "Light (Dark Logo)",
  },
  blue: {
    primary: "#3B82F6",
    secondary: "rgba(59, 130, 246, 0.8)",
    accent: "#3B82F6",
    bg: "#0B0D10",
    label: "Blue Accent",
  },
};

const logoVariants: { value: LogoVariant; label: string; description: string }[] = [
  { value: "full", label: "Full Logo", description: "Icon + Wordmark" },
  { value: "icon", label: "Icon Only", description: "Stacked bars icon" },
  { value: "wordmark", label: "Wordmark Only", description: "Text only" },
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

// Generate clean SVG strings for export
function generateIconSVG(colors: ColorConfig, size: number = 64): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">
  <!-- Stack layers - 4 bars from bottom to top -->
  <rect x="4" y="20" width="24" height="3" rx="1" fill="${colors.primary}" opacity="0.4"/>
  <rect x="6" y="14" width="20" height="3" rx="1" fill="${colors.primary}" opacity="0.6"/>
  <rect x="8" y="8" width="16" height="3" rx="1" fill="${colors.primary}" opacity="0.8"/>
  <rect x="10" y="2" width="12" height="3" rx="1" fill="${colors.accent}"/>
</svg>`;
}

function generateWordmarkSVG(colors: ColorConfig, size: number = 64): string {
  const scale = size / 64;
  const width = Math.round(160 * scale);
  const height = size;
  const fontSize = Math.round(24 * scale);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 160 64" fill="none">
  <text x="0" y="42" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600">
    <tspan fill="${colors.accent}">Crowd</tspan><tspan fill="${colors.primary}">Stack</tspan>
  </text>
</svg>`;
}

function generateFullLogoSVG(colors: ColorConfig, size: number = 64): string {
  const scale = size / 64;
  const totalWidth = Math.round((32 + 8 + 130) * scale); // icon + gap + text
  const height = size;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 170 32" fill="none">
  <!-- Icon - 4 stacked bars -->
  <g>
    <rect x="4" y="20" width="24" height="3" rx="1" fill="${colors.primary}" opacity="0.4"/>
    <rect x="6" y="14" width="20" height="3" rx="1" fill="${colors.primary}" opacity="0.6"/>
    <rect x="8" y="8" width="16" height="3" rx="1" fill="${colors.primary}" opacity="0.8"/>
    <rect x="10" y="2" width="12" height="3" rx="1" fill="${colors.accent}"/>
  </g>
  <!-- Wordmark -->
  <text x="40" y="23" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" letter-spacing="-0.02em">
    <tspan fill="${colors.accent}">Crowd</tspan><tspan fill="${colors.primary}">Stack</tspan>
  </text>
</svg>`;
}

function getSVGForVariant(variant: LogoVariant, colors: ColorConfig, size: number = 64): string {
  switch (variant) {
    case "icon":
      return generateIconSVG(colors, size);
    case "wordmark":
      return generateWordmarkSVG(colors, size);
    case "full":
    default:
      return generateFullLogoSVG(colors, size);
  }
}

export default function BrandAssetsPage() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const copyToClipboard = (text: string, colorName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const downloadSVG = (variant: LogoVariant, scheme: ColorScheme) => {
    const colors = colorSchemes[scheme];
    const svg = getSVGForVariant(variant, colors, 64);
    
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `crowdstack-${variant}-${scheme}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = async (variant: LogoVariant, scheme: ColorScheme, scale: number = 2) => {
    const key = `${variant}-${scheme}-${scale}`;
    setDownloading(key);
    
    try {
      const colors = colorSchemes[scheme];
      // Generate at higher base resolution for better quality
      const baseSize = 128;
      const svg = getSVGForVariant(variant, colors, baseSize);
    
      // Parse to get actual dimensions
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      const width = parseInt(svgEl?.getAttribute("width") || "128") * scale;
      const height = parseInt(svgEl?.getAttribute("height") || "128") * scale;
      
      // Create scaled SVG
      const scaledSvg = getSVGForVariant(variant, colors, baseSize * scale);
    
      // Convert to data URL
      const svgBlob = new Blob([scaledSvg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
    
      // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Load and draw image
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Fill background for light scheme, transparent for others
          if (scheme === "light") {
            ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
    }
    
      ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = reject;
        img.src = svgUrl;
      });
      
      URL.revokeObjectURL(svgUrl);
      
      // Download PNG
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `crowdstack-${variant}-${scheme}-${scale}x.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PNG:", error);
    } finally {
      setDownloading(null);
    }
  };

  const downloadAllAssets = async () => {
    const variants: LogoVariant[] = ["full", "icon", "wordmark"];
    const schemes: ColorScheme[] = ["dark", "light", "blue"];
    
    for (const variant of variants) {
      for (const scheme of schemes) {
          downloadSVG(variant, scheme);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };

  // Preview component using actual SVG
  const LogoPreview = ({ variant, scheme }: { variant: LogoVariant; scheme: ColorScheme }) => {
    const colors = colorSchemes[scheme];
    const svg = getSVGForVariant(variant, colors, 48);
    
    return (
      <div
        dangerouslySetInnerHTML={{ __html: svg }}
        className="flex items-center justify-center"
      />
    );
  };

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
          <h1 className="text-2xl font-bold text-primary mb-2">Brand Assets</h1>
          <p className="text-sm text-secondary">
            Download CrowdStack logos and brand materials in various formats
          </p>
        </div>

        {/* Quick Download */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-primary mb-1">Quick Download</h2>
              <p className="text-sm text-secondary">Download all logo variations at once</p>
            </div>
            <Button onClick={downloadAllAssets}>
              <Download className="h-4 w-4 mr-2" />
              Download All SVGs
            </Button>
          </div>
        </Card>

        {/* Logo Variations */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-primary mb-4">Logo Variations</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {logoVariants.map((logoVar) => (
              <Card key={logoVar.value} className="overflow-hidden">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-primary">{logoVar.label}</h3>
                  <p className="text-xs text-secondary">{logoVar.description}</p>
                </div>
                
                {/* Preview for each color scheme */}
                <div className="space-y-3">
                  {(Object.keys(colorSchemes) as ColorScheme[]).map((scheme) => {
                    const colors = colorSchemes[scheme];
                    return (
                      <div key={scheme} className="rounded-lg overflow-hidden">
                      <div
                          className="p-6 flex items-center justify-center min-h-[80px]"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <LogoPreview variant={logoVar.value} scheme={scheme} />
                      </div>
                      <div className="flex gap-2 p-2 bg-raised">
                        <button
                            onClick={() => downloadSVG(logoVar.value, scheme)}
                          className="flex-1 text-xs px-3 py-1.5 rounded bg-glass hover:bg-active text-secondary hover:text-primary transition-colors"
                        >
                          SVG
                        </button>
                        <button
                            onClick={() => downloadPNG(logoVar.value, scheme, 2)}
                            disabled={downloading === `${logoVar.value}-${scheme}-2`}
                            className="flex-1 text-xs px-3 py-1.5 rounded bg-glass hover:bg-active text-secondary hover:text-primary transition-colors disabled:opacity-50"
                        >
                            {downloading === `${logoVar.value}-${scheme}-2` ? "..." : "PNG 2x"}
                        </button>
                        <button
                            onClick={() => downloadPNG(logoVar.value, scheme, 4)}
                            disabled={downloading === `${logoVar.value}-${scheme}-4`}
                            className="flex-1 text-xs px-3 py-1.5 rounded bg-glass hover:bg-active text-secondary hover:text-primary transition-colors disabled:opacity-50"
                        >
                            {downloading === `${logoVar.value}-${scheme}-4` ? "..." : "PNG 4x"}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* High-Res Downloads */}
        <Card className="mb-12">
          <h2 className="text-lg font-semibold text-primary mb-4">High Resolution Downloads</h2>
          <p className="text-sm text-secondary mb-4">
            Download larger PNG files for print and high-DPI displays
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(["full", "icon"] as LogoVariant[]).map((variant) =>
              (["dark", "light"] as ColorScheme[]).map((scheme) => (
                <button
                  key={`${variant}-${scheme}-8`}
                  onClick={() => downloadPNG(variant, scheme, 8)}
                  disabled={downloading === `${variant}-${scheme}-8`}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-glass hover:bg-active text-secondary hover:text-primary transition-colors disabled:opacity-50 text-sm"
                >
                  <Download className="h-4 w-4" />
                  {downloading === `${variant}-${scheme}-8` 
                    ? "Generating..." 
                    : `${variant === "full" ? "Full" : "Icon"} ${scheme === "dark" ? "White" : "Dark"} 8x`}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Brand Colors */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-primary mb-4">Brand Colors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {brandColors.map((color) => (
              <Card key={color.name} className="p-0 overflow-hidden">
                <div
                  className="h-20 w-full"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="p-3">
                  <p className="text-xs font-medium text-primary mb-1">{color.name}</p>
                  <button
                    onClick={() => copyToClipboard(color.hex, color.name)}
                    className="flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
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
          <h2 className="text-lg font-semibold text-primary mb-4">Usage Guidelines</h2>
          <div className="space-y-4 text-sm text-secondary">
            <div>
              <h3 className="font-medium text-primary mb-1">Clear Space</h3>
              <p>Maintain clear space around the logo equal to the height of the "C" in CrowdStack.</p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Minimum Size</h3>
              <p>The full logo should not be smaller than 100px wide. The icon should not be smaller than 24px.</p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Color Usage</h3>
              <p>Use the white logo on dark backgrounds, the dark logo on light backgrounds. The blue accent version is for special applications.</p>
            </div>
            <div>
              <h3 className="font-medium text-primary mb-1">Don't</h3>
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
