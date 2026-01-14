"use client";

import { useState, useMemo } from "react";
import { Card, Button, Input, Select, useToast } from "@crowdstack/ui";
import { Copy, Check, Code, Eye, Sun, Moon, LayoutList, LayoutGrid, Smartphone, ExternalLink } from "lucide-react";

interface WidgetGeneratorTabProps {
  venueSlug?: string;
  organizerId?: string;
  accentColor?: string | null;
  entityName?: string;
}

type WidgetTheme = "light" | "dark";
type WidgetLayout = "list" | "grid" | "full";
type CardSize = "sm" | "md" | "lg";

export function WidgetGeneratorTab({
  venueSlug,
  organizerId,
  accentColor,
  entityName,
}: WidgetGeneratorTabProps) {
  const { success: toastSuccess } = useToast();
  const [copied, setCopied] = useState(false);

  // Widget configuration state
  const [config, setConfig] = useState({
    theme: "dark" as WidgetTheme,
    layout: "list" as WidgetLayout,
    cardSize: "sm" as CardSize,
    limit: 5,
    accent: accentColor?.replace("#", "") || "9933ff",
    hideHeader: false,
    width: "100%",
    height: "500",
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://crowdstack.app";

  // Build widget URL based on entity type
  const widgetUrl = useMemo(() => {
    const entityPath = venueSlug
      ? `/widget/venue/${venueSlug}`
      : `/widget/organizer/${organizerId}`;

    const params = new URLSearchParams();
    params.set("theme", config.theme);
    params.set("layout", config.layout);
    params.set("limit", config.limit.toString());
    if (config.accent) {
      params.set("accent", config.accent);
    }
    if (config.hideHeader) {
      params.set("hideHeader", "true");
    }
    if (config.layout === "full" && config.cardSize) {
      params.set("cardSize", config.cardSize);
    }

    return `${baseUrl}${entityPath}?${params.toString()}`;
  }, [venueSlug, organizerId, config, baseUrl]);

  // Generate embed code
  const embedCode = useMemo(() => {
    const heightValue = config.height.includes("%") ? config.height : `${config.height}px`;
    return `<iframe
  src="${widgetUrl}"
  width="${config.width}"
  height="${heightValue}"
  frameborder="0"
  style="border: none; border-radius: 12px;"
  title="Upcoming Events - ${entityName || "CrowdStack"}"
></iframe>`;
  }, [widgetUrl, config.width, config.height, entityName]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toastSuccess("Embed code copied to clipboard", "Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const limitOptions = [
    { value: "3", label: "3 events" },
    { value: "5", label: "5 events" },
    { value: "10", label: "10 events" },
    { value: "15", label: "15 events" },
    { value: "20", label: "20 events" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-primary mb-2 flex items-center gap-2">
              <Code className="h-6 w-6" />
              Embed Widget
            </h2>
            <p className="text-sm text-secondary">
              Add an events widget to your website to display upcoming events. Customize the
              appearance and copy the embed code to add it to any webpage.
            </p>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Theme</label>
              <div className="flex gap-2">
                <Button
                  variant={config.theme === "dark" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setConfig({ ...config, theme: "dark" })}
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={config.theme === "light" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setConfig({ ...config, theme: "light" })}
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
              </div>
            </div>

            {/* Layout */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Layout</label>
              <div className="flex gap-2">
                <Button
                  variant={config.layout === "list" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setConfig({ ...config, layout: "list" })}
                  className="flex-1"
                >
                  <LayoutList className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={config.layout === "grid" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setConfig({ ...config, layout: "grid" })}
                  className="flex-1"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid
                </Button>
                <Button
                  variant={config.layout === "full" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setConfig({ ...config, layout: "full" })}
                  className="flex-1"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Full
                </Button>
              </div>
              <p className="text-xs text-muted">
                {config.layout === "full" ? "9:16 aspect ratio - shows entire flier" :
                 config.layout === "grid" ? "3:4 portrait cards in a grid" :
                 "Compact horizontal rows"}
              </p>
            </div>

            {/* Card Size (only for Full layout) */}
            {config.layout === "full" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary">Card Size</label>
                <div className="flex gap-2">
                  <Button
                    variant={config.cardSize === "sm" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setConfig({ ...config, cardSize: "sm" })}
                    className="flex-1"
                  >
                    Small
                  </Button>
                  <Button
                    variant={config.cardSize === "md" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setConfig({ ...config, cardSize: "md" })}
                    className="flex-1"
                  >
                    Medium
                  </Button>
                  <Button
                    variant={config.cardSize === "lg" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setConfig({ ...config, cardSize: "lg" })}
                    className="flex-1"
                  >
                    Large
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  {config.cardSize === "lg" ? "280px wide cards" :
                   config.cardSize === "md" ? "220px wide cards" :
                   "160px wide cards"}
                </p>
              </div>
            )}

            {/* Event Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Number of Events</label>
              <Select
                value={config.limit.toString()}
                onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value, 10) })}
                options={limitOptions}
              />
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Accent Color</label>
              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded-lg border border-border-strong flex-shrink-0"
                  style={{ backgroundColor: `#${config.accent}` }}
                />
                <Input
                  type="text"
                  value={config.accent}
                  onChange={(e) =>
                    setConfig({ ...config, accent: e.target.value.replace("#", "") })
                  }
                  placeholder="9933ff"
                  maxLength={6}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Width */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Width</label>
              <Input
                type="text"
                value={config.width}
                onChange={(e) => setConfig({ ...config, width: e.target.value })}
                placeholder="100% or 400px"
              />
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary">Height (px)</label>
              <Input
                type="number"
                value={config.height}
                onChange={(e) => setConfig({ ...config, height: e.target.value })}
                placeholder="500"
                min={200}
                max={2000}
              />
            </div>

            {/* Hide Header */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.hideHeader}
                  onChange={(e) => setConfig({ ...config, hideHeader: e.target.checked })}
                  className="w-4 h-4 rounded border-border-strong text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm font-medium text-primary">Hide widget header</span>
                <span className="text-sm text-secondary">
                  (removes logo and &quot;Powered by CrowdStack&quot;)
                </span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </h3>
            <a
              href={widgetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent-primary hover:underline flex items-center gap-1"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div
            className="rounded-xl overflow-hidden border border-border-strong"
            style={{ height: `${Math.min(parseInt(config.height) || 500, 600)}px` }}
          >
            <iframe
              src={widgetUrl}
              width="100%"
              height="100%"
              style={{ border: "none" }}
              title="Widget Preview"
            />
          </div>
        </div>
      </Card>

      {/* Embed Code */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyCode}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
          <pre className="bg-void p-4 rounded-lg overflow-x-auto text-sm font-mono text-secondary border border-border-strong">
            {embedCode}
          </pre>
          <p className="text-sm text-muted">
            Copy this code and paste it into your website&apos;s HTML where you want the widget to appear.
          </p>
        </div>
      </Card>
    </div>
  );
}
